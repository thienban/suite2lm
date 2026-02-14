package handlers

import (
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

const workspaceDir = "../workspace"

// FileInfo represents metadata for a file
type FileInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// ListFiles returns a list of .md files in the workspace
func ListFiles(c *gin.Context) {
	files, err := ioutil.ReadDir(workspaceDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to read directory: " + err.Error()})
		return
	}

	var fileList []FileInfo
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".md") {
			fileList = append(fileList, FileInfo{
				Name: file.Name(),
				Path: filepath.Join(workspaceDir, file.Name()),
			})
		}
	}

	c.JSON(http.StatusOK, fileList)
}

// GetFileContent reads and returns the content of a specific file
func GetFileContent(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename is required"})
		return
	}

	// Security check: prevent directory traversal
	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	filePath := filepath.Join(workspaceDir, name)
	content, err := ioutil.ReadFile(filePath)
	if os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to read file"})
		return
	}

	c.String(http.StatusOK, string(content))
}

// SaveFileContent overwrites the content of a specific file
func SaveFileContent(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename is required"})
		return
	}

	// Security check
	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	// Read body content
	body, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to read request body"})
		return
	}

	filePath := filepath.Join(workspaceDir, name)
	err = ioutil.WriteFile(filePath, body, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to write file"})
		return
	}

	c.Status(http.StatusOK)
}
