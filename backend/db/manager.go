package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

type DatabaseManager struct {
	DB *sqlx.DB
}

func NewDatabaseManager(dbPath string) (*DatabaseManager, error) {
	var db *sql.DB
	var err error

	// If path starts with libsql:// or wss://, it's a remote URL
	if strings.HasPrefix(dbPath, "libsql://") || strings.HasPrefix(dbPath, "wss://") {
		db, err = sql.Open("libsql", dbPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open remote db: %w", err)
		}
	} else {
		// Otherwise, assume local file
		// Ensure directory exists
		dir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create db directory: %w", err)
		}

		// Normalizing Windows paths for file: protocol
		url := "file:" + dbPath + "?_journal_mode=WAL&_busy_timeout=5000"
		db, err = sql.Open("libsql", url)
		if err != nil {
			return nil, fmt.Errorf("failed to open db: %w", err)
		}
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}

	// Wrap with sqlx
	dbx := sqlx.NewDb(db, "sqlite")

	// Initialize system tables
	if err := initSystemTables(dbx); err != nil {
		return nil, err
	}

	return &DatabaseManager{DB: dbx}, nil
}

func initSystemTables(db *sqlx.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS _system_queries (
		id TEXT PRIMARY KEY,
		sql TEXT NOT NULL,
		question TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return fmt.Errorf("failed to init system tables: %w", err)
	}
	return nil
}

func (m *DatabaseManager) Close() error {
	return m.DB.Close()
}

// GetSchema returns the DDL for all tables in the database.
func (m *DatabaseManager) GetSchema() (string, error) {
	if m.DB == nil {
		return "", fmt.Errorf("database not initialized")
	}

	rows, err := m.DB.Query("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var schema strings.Builder
	for rows.Next() {
		var sql string
		if err := rows.Scan(&sql); err != nil {
			return "", err
		}
		schema.WriteString(sql)
		schema.WriteString(";\n")
	}
	return schema.String(), nil
}
