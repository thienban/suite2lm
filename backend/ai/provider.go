package ai

// Provider defines the interface for LLM providers.
type Provider interface {
	// Complete sends a prompt to the LLM and returns the response.
	Complete(req CompletionRequest) (*CompletionResponse, error)
}

// CompletionRequest contains the data sent to the LLM.
type CompletionRequest struct {
	SystemPrompt string `json:"system_prompt"`
	UserPrompt   string `json:"user_prompt"`
	MaxTokens    int    `json:"max_tokens,omitempty"`
	Temperature  float64 `json:"temperature,omitempty"`
}

// CompletionResponse contains the LLM's response.
type CompletionResponse struct {
	Content string `json:"content"`
	Usage   Usage  `json:"usage,omitempty"`
}

// Usage tracks token usage for monitoring.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// CommandRequest is the request body from the frontend.
type CommandRequest struct {
	Prompt  string         `json:"prompt" binding:"required"`
	Context CommandContext `json:"context"`
	Mode    string         `json:"mode" binding:"required"` // table_edit | text_generate | text_refactor | table_generate
}

// CommandContext provides document context to the AI.
type CommandContext struct {
	DocumentContent string `json:"documentContent,omitempty"`
	Selection       string `json:"selection,omitempty"`
	CursorPosition  int    `json:"cursorPosition,omitempty"`
	ActiveTable     string `json:"activeTable,omitempty"` // JSON string of the active table
}

// CommandResponse is the response sent back to the frontend.
type CommandResponse struct {
	Type    string `json:"type"`    // table_update | text_insert | text_replace | error
	Content string `json:"content"` // The generated content (JSON for tables, text for writing)
	Message string `json:"message"` // Human-readable message
}
