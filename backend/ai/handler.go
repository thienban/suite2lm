package ai

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"suite2lm/db"

	"github.com/gin-gonic/gin"
)

// Handler holds the AI provider and serves HTTP requests.
type Handler struct {
	provider  Provider
	config    *Config
	dbManager *db.DatabaseManager
}

// NewHandler creates a new AI handler.
func NewHandler(provider Provider, config *Config, dbManager *db.DatabaseManager) *Handler {
	return &Handler{
		provider:  provider,
		config:    config,
		dbManager: dbManager,
	}
}

// HandleCommand processes a POST /api/ai/command request.
func (h *Handler) HandleCommand(c *gin.Context) {
	var req CommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, CommandResponse{
			Type:    "error",
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	// Inject DB Schema for text_to_sql if available
	if req.Mode == "text_to_sql" && h.dbManager != nil {
		schema, err := h.dbManager.GetSchema()
		if err != nil {
			log.Printf("[AI] Failed to get schema: %v", err)
		} else {
			// Prepend global schema to context
			if req.Context.ActiveTable != "" {
				req.Context.ActiveTable = schema + "\n\n" + req.Context.ActiveTable
			} else {
				req.Context.ActiveTable = schema
			}
		}
	}

	// Build the prompt
	systemPrompt, userPrompt, err := BuildPrompt(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, CommandResponse{
			Type:    "error",
			Message: err.Error(),
		})
		return
	}

	log.Printf("[AI] Mode: %s | Prompt: %.80s...", req.Mode, req.Prompt)

	// Call the LLM
	completionReq := CompletionRequest{
		SystemPrompt: systemPrompt,
		UserPrompt:   userPrompt,
		MaxTokens:    h.config.MaxTokens,
		Temperature:  h.config.Temperature,
	}

	resp, err := h.provider.Complete(completionReq)
	if err != nil {
		log.Printf("[AI] Error: %v", err)
		c.JSON(http.StatusInternalServerError, CommandResponse{
			Type:    "error",
			Message: "AI service error: " + err.Error(),
		})
		return
	}

	log.Printf("[AI] Tokens used: %d", resp.Usage.TotalTokens)

	// Post-process the response based on mode
	content := strings.TrimSpace(resp.Content)
	responseType := ResponseTypeForMode(req.Mode)

	// Clean markdown fences for all modes
	content = cleanMarkdown(content)

	// For table modes, validate and extract JSON if necessary
	if req.Mode == "table_generate" || req.Mode == "table_edit" {
		if !json.Valid([]byte(content)) {
			// Try to extract JSON from text
			extracted := extractJSON(content)
			if json.Valid([]byte(extracted)) {
				content = extracted
			} else {
				c.JSON(http.StatusInternalServerError, CommandResponse{
					Type:    "error",
					Content: content,
					Message: "L'IA a retourné un JSON invalide. Réessayez avec une instruction plus précise.",
				})
				return
			}
		}
	}

	c.JSON(http.StatusOK, CommandResponse{
		Type:    responseType,
		Content: content,
		Message: "OK",
	})
}

// cleanMarkdown strips markdown code fences from LLM output.
func cleanMarkdown(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		lines := strings.Split(s, "\n")
		if len(lines) >= 2 {
			// Remove first line (fence + language)
			lines = lines[1:]
			// Remove last line if it's a fence
			if strings.TrimSpace(lines[len(lines)-1]) == "```" {
				lines = lines[:len(lines)-1]
			}
			return strings.TrimSpace(strings.Join(lines, "\n"))
		}
	}
	return s
}

// extractJSON attempts to find the largest valid JSON array or object in the string.
func extractJSON(s string) string {
	// If it's already valid JSON, return as-is
	if json.Valid([]byte(s)) {
		return s
	}

	var candidates []string
	pos := 0

	for pos < len(s) {
		// Find next opening bracket
		nextStart := -1
		var oc, cc byte
		for i := pos; i < len(s); i++ {
			if s[i] == '[' {
				nextStart = i
				oc = '['
				cc = ']'
				break
			}
			if s[i] == '{' {
				nextStart = i
				oc = '{'
				cc = '}'
				break
			}
		}
		if nextStart == -1 {
			break
		}

		// Walk forward counting brackets
		depth := 0
		inStr := false
		esc := false
		endIdx := -1

		for i := nextStart; i < len(s); i++ {
			ch := s[i]
			if esc {
				esc = false
				continue
			}
			if ch == '\\' && inStr {
				esc = true
				continue
			}
			if ch == '"' {
				inStr = !inStr
				continue
			}
			if inStr {
				continue
			}
			if ch == oc {
				depth++
			} else if ch == cc {
				depth--
				if depth == 0 {
					endIdx = i
					break
				}
			}
		}

		if endIdx == -1 {
			break
		}

		candidate := s[nextStart : endIdx+1]
		if json.Valid([]byte(candidate)) {
			candidates = append(candidates, candidate)
		}
		pos = endIdx + 1
	}

	// Return the LAST valid JSON (the modified table, not the original)
	if len(candidates) > 0 {
		return candidates[len(candidates)-1]
	}

	return s
}
