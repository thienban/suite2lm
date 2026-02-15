package ai

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds the AI service configuration.
type Config struct {
	Provider    string  // "openai" | "gemini"
	APIKey      string
	Model       string
	MaxTokens   int
	Temperature float64
}

// LoadConfig reads AI configuration from environment variables.
func LoadConfig() (*Config, error) {
	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("LLM_API_KEY environment variable is required")
	}

	provider := os.Getenv("LLM_PROVIDER")
	if provider == "" {
		provider = "openai" // Default provider
	}

	model := os.Getenv("LLM_MODEL")
	if model == "" {
		switch provider {
		case "gemini":
			model = "gemini-2.0-flash"
		default:
			model = "gpt-4o-mini"
		}
	}

	maxTokens := 2048
	if mt := os.Getenv("LLM_MAX_TOKENS"); mt != "" {
		if v, err := strconv.Atoi(mt); err == nil {
			maxTokens = v
		}
	}

	temperature := 0.7
	if t := os.Getenv("LLM_TEMPERATURE"); t != "" {
		if v, err := strconv.ParseFloat(t, 64); err == nil {
			temperature = v
		}
	}

	return &Config{
		Provider:    provider,
		APIKey:      apiKey,
		Model:       model,
		MaxTokens:   maxTokens,
		Temperature: temperature,
	}, nil
}

// NewProvider creates a Provider based on the config.
func NewProvider(cfg *Config) (Provider, error) {
	switch cfg.Provider {
	case "openai":
		return NewOpenAIProvider(cfg), nil
	case "gemini":
		return NewGeminiProvider(cfg), nil
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", cfg.Provider)
	}
}
