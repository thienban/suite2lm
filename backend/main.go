package main

import (
	"log"
	"os"
	"suite2lm/ai"
	"suite2lm/db"
	"suite2lm/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if present (ignore error if not found)
	_ = godotenv.Load()

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"} // Allow frontend
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Ensure workspace directory exists
	workspaceDir := "../workspace"
	if _, err := os.Stat(workspaceDir); os.IsNotExist(err) {
		err := os.Mkdir(workspaceDir, 0755)
		if err != nil {
			log.Fatalf("Failed to create workspace directory: %v", err)
		}
	}

	// Register file routes
	api := r.Group("/api")
	{
		api.GET("/files", handlers.ListFiles)
		api.GET("/files/:name", handlers.GetFileContent)
		api.POST("/files/:name", handlers.SaveFileContent)
	}

	// Database service
	var dbManager *db.DatabaseManager
	dbPath := "../workspace/data.db"
	if remoteURL := os.Getenv("TURSO_DATABASE_URL"); remoteURL != "" {
		dbPath = remoteURL
	}

	manager, err := db.NewDatabaseManager(dbPath)
	if err != nil {
		log.Printf("⚠️  Database service disabled: %v", err)
	} else {
		dbManager = manager
		defer dbManager.Close()

		dbHandler := handlers.NewDBHandler(dbManager)
		api.POST("/db/sync", dbHandler.SyncTable)
		api.POST("/db/query", dbHandler.ExecuteQuery) // Kept for AI interaction for now

		// Secure Viewer Endpoints
		api.GET("/db/tables", dbHandler.ListTables)
		api.GET("/db/tables/:name", dbHandler.GetTableData)
		api.GET("/db/tables/:name/schema", dbHandler.GetTableSchema)
		log.Println("✅ Database service enabled")
	}

	// Register AI routes (optional — only if LLM_API_KEY is configured)
	aiConfig, err := ai.LoadConfig()
	if err != nil {
		log.Printf("⚠️  AI service disabled: %v", err)
		log.Println("💡 Set LLM_API_KEY in .env to enable AI features.")
	} else {
		provider, err := ai.NewProvider(aiConfig)
		if err != nil {
			log.Printf("⚠️  AI service disabled: %v", err)
		} else {
			aiHandler := ai.NewHandler(provider, aiConfig, dbManager)
			api.POST("/ai/command", aiHandler.HandleCommand)
			log.Printf("✅ AI service enabled (provider: %s, model: %s)", aiConfig.Provider, aiConfig.Model)
		}
	}

	// Start server
	log.Println("Server executing on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
