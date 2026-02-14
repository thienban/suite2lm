package main

import (
	"log"
	"os"
	"suite2lm/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"} // Allow frontend
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(config))

	// Ensure workspace directory exists
	workspaceDir := "../workspace"
	if _, err := os.Stat(workspaceDir); os.IsNotExist(err) {
		err := os.Mkdir(workspaceDir, 0755)
		if err != nil {
			log.Fatalf("Failed to create workspace directory: %v", err)
		}
	}

	// Register routes
	api := r.Group("/api")
	{
		api.GET("/files", handlers.ListFiles)
		api.GET("/files/:name", handlers.GetFileContent)
		api.POST("/files/:name", handlers.SaveFileContent)
	}

	// Start server
	log.Println("Server executing on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
