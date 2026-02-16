package ai

import "strings"

type MockProvider struct{}

func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (p *MockProvider) Complete(req CompletionRequest) (*CompletionResponse, error) {
	content := "I am a mock AI."

	if strings.Contains(req.SystemPrompt, "expert SQL") {
		content = "```sql\nSELECT * FROM products LIMIT 10;\n```"
	} else if strings.Contains(req.SystemPrompt, "JSON") {
		content = "```json\n{\"schema\":[{\"key\":\"col1\",\"type\":\"text\"}],\"data\":[{\"col1\":\"value\"}]}\n```"
	}

	return &CompletionResponse{
		Content: content,
		Usage: Usage{
			PromptTokens:     10,
			CompletionTokens: 10,
			TotalTokens:      20,
		},
	}, nil
}
