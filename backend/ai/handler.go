package ai

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Handler holds the AI provider and serves HTTP requests.
type Handler struct {
	provider Provider
	config   *Config
}

// NewHandler creates a new AI handler.
func NewHandler(provider Provider, config *Config) *Handler {
	return &Handler{
		provider: provider,
		config:   config,
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

	// For table modes, validate that the response is valid JSON
	if req.Mode == "table_generate" || req.Mode == "table_edit" {
		content = cleanJSONResponse(content)
		if !json.Valid([]byte(content)) {
			c.JSON(http.StatusInternalServerError, CommandResponse{
				Type:    "error",
				Content: content,
				Message: "L'IA a retourné un JSON invalide. Réessayez avec une instruction plus précise.",
			})
			return
		}
	}

	c.JSON(http.StatusOK, CommandResponse{
		Type:    responseType,
		Content: content,
		Message: "OK",
	})
}

// cleanJSONResponse strips markdown code fences and extracts valid JSON from LLM output.
func cleanJSONResponse(s string) string {
	s = strings.TrimSpace(s)

	// Remove ```json ... ``` wrapping
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}

	// If it's already valid JSON, return as-is
	if json.Valid([]byte(s)) {
		return s
	}

	// Find ALL valid JSON arrays/objects by bracket-matching, then take the last one
	// (LLMs sometimes output original + modified table concatenated)
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
