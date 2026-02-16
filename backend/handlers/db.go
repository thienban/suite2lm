package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"suite2lm/db"

	"github.com/gin-gonic/gin"
)

type DBHandler struct {
	Manager *db.DatabaseManager
}

func NewDBHandler(manager *db.DatabaseManager) *DBHandler {
	return &DBHandler{Manager: manager}
}

type SyncTableRequest struct {
	ID     string                   `json:"id"`
	Schema []TableColumn            `json:"schema"`
	Data   []map[string]interface{} `json:"data"`
}

type TableColumn struct {
	Key  string `json:"key"`
	Type string `json:"type"`
}

type ExecuteQueryRequest struct {
	Query string `json:"query"`
}

func (h *DBHandler) SyncTable(c *gin.Context) {
	var req SyncTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tableName := req.ID
	// Sanitize table name (simple alphanumeric check + underscores)
	// For MVP simplicity
	if tableName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Table ID is required"})
		return
	}

	if h.Manager.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	// 1. Drop existing table
	_, err := h.Manager.DB.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to drop table: " + err.Error()})
		return
	}

	// 2. Create table
	if len(req.Schema) == 0 {
		c.JSON(http.StatusOK, gin.H{"status": "empty_schema"})
		return
	}

	var cols []string
	for _, col := range req.Schema {
		sqlType := "TEXT"
		switch col.Type {
		case "number", "currency", "percentage":
			sqlType = "REAL"
		case "date":
			sqlType = "TEXT" // SQLite dates are text
		}
		cols = append(cols, fmt.Sprintf("%s %s", col.Key, sqlType))
	}

	// Using string formatting for table creation (placeholders not supported for DDL)
	// BEWARE: This is vulnerable to SQL injection if tableName or col.Key contains specialized characters
	// In production, strictly validate/escape identifiers.

	createSQL := fmt.Sprintf("CREATE TABLE %s (%s)", tableName, strings.Join(cols, ", "))
	_, err = h.Manager.DB.Exec(createSQL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create table: " + err.Error()})
		return
	}

	// 3. Insert data
	// Using transaction for speed
	tx, err := h.Manager.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin transaction: " + err.Error()})
		return
	}

	if len(req.Data) > 0 {
		stmtStr := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			tableName,
			strings.Join(getColumnKeys(req.Schema), ", "),
			placeholders(len(req.Schema)),
		)

		stmt, err := tx.Prepare(stmtStr)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare statement: " + err.Error()})
			return
		}
		defer stmt.Close()

		for _, row := range req.Data {
			vals := make([]interface{}, len(req.Schema))
			for i, col := range req.Schema {
				vals[i] = row[col.Key]
			}
			_, err = stmt.Exec(vals...)
			if err != nil {
				log.Printf("Failed to insert row: %v", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "synced", "table": tableName, "rows": len(req.Data)})
}

func (h *DBHandler) ExecuteQuery(c *gin.Context) {
	var req ExecuteQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Security check: Only allow SELECT
	queryUpper := strings.ToUpper(strings.TrimSpace(req.Query))
	if !strings.HasPrefix(queryUpper, "SELECT") && !strings.HasPrefix(queryUpper, "PRAGMA") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only SELECT or PRAGMA queries are allowed"})
		return
	}

	rows, err := h.Manager.DB.Query(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var result []map[string]interface{}

	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, colName := range cols {
			valPtr := columnPointers[i].(*interface{})
			val := *valPtr

			// Handle []byte specifically for text columns in SQLite/libSQL driver sometimes
			if b, ok := val.([]byte); ok {
				row[colName] = string(b)
			} else {
				row[colName] = val
			}
		}
		result = append(result, row)
	}

	if result == nil {
		result = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func getColumnKeys(schema []TableColumn) []string {
	keys := make([]string, len(schema))
	for i, col := range schema {
		keys[i] = col.Key
	}
	return keys
}

func placeholders(n int) string {
	ps := make([]string, n)
	for i := range ps {
		ps[i] = "?"
	}
	return strings.Join(ps, ", ")
}

func (h *DBHandler) ListTables(c *gin.Context) {
	if h.Manager.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	query := "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
	rows, err := h.Manager.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var tables []map[string]string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		tables = append(tables, map[string]string{"name": name})
	}

	if tables == nil {
		tables = []map[string]string{}
	}

	c.JSON(http.StatusOK, gin.H{"data": tables})
}

func (h *DBHandler) GetTableData(c *gin.Context) {
	tableName := c.Param("name")
	// Basic sanitation - robust validation recommended for prod
	if tableName == "" || strings.ContainsAny(tableName, "; \" '") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid table name"})
		return
	}

	// Fetch data (LIMIT 100 for safety)
	query := fmt.Sprintf("SELECT * FROM %s LIMIT 100", tableName)
	rows, err := h.Manager.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var result []map[string]interface{}

	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, colName := range cols {
			valPtr := columnPointers[i].(*interface{})
			val := *valPtr
			if b, ok := val.([]byte); ok {
				row[colName] = string(b)
			} else {
				row[colName] = val
			}
		}
		result = append(result, row)
	}

	if result == nil {
		result = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *DBHandler) GetTableSchema(c *gin.Context) {
	tableName := c.Param("name")
	if tableName == "" || strings.ContainsAny(tableName, "; \" '") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid table name"})
		return
	}

	query := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	rows, err := h.Manager.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var columns []map[string]interface{}
	// PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
	for rows.Next() {
		var cid int
		var name, dtype string
		var notnull, pk int
		var dflt interface{}

		if err := rows.Scan(&cid, &name, &dtype, &notnull, &dflt, &pk); err != nil {
			continue
		}
		columns = append(columns, map[string]interface{}{
			"name": name,
			"type": dtype,
		})
	}

	if columns == nil {
		columns = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"data": columns})
}
