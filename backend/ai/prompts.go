package ai

import "fmt"

// System prompts for each AI mode.
var systemPrompts = map[string]string{
	"table_generate": `Tu es un assistant spécialisé dans la génération de tableaux de données.
Génère un tableau au format JSON (array of arrays). La première ligne contient les headers.
Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans explication.
Exemple de format attendu :
[["Colonne1","Colonne2"],["val1","val2"]]`,

	"table_edit": `Tu es un assistant spécialisé dans la modification de tableaux de données.
On te fournit un tableau au format JSON (array of arrays, première ligne = headers).
Applique la modification demandée et retourne le tableau complet modifié.
RÈGLES STRICTES :
- Retourne UNIQUEMENT le tableau modifié, PAS l'original.
- Retourne UN SEUL tableau JSON.
- Pas de markdown, pas de backticks, pas d'explication, pas de texte avant ou après le JSON.
- Le résultat doit commencer par [ et finir par ].`,

	"text_generate": `Tu es un assistant d'écriture.
Continue le texte fourni de manière naturelle et cohérente.
Réponds UNIQUEMENT avec le texte de continuation, sans préfixe ni explication.
Écris en français sauf si le texte source est dans une autre langue.`,

	"text_refactor": `Tu es un assistant d'écriture spécialisé dans la refactorisation de texte.
Réécris le texte fourni selon l'instruction donnée.
Conserve le sens original mais adapte le style selon la demande.
Réponds UNIQUEMENT avec le texte réécrit, sans préfixe ni explication.`,
}

// BuildPrompt constructs the user prompt based on the mode and context.
func BuildPrompt(req CommandRequest) (systemPrompt string, userPrompt string, err error) {
	sp, ok := systemPrompts[req.Mode]
	if !ok {
		return "", "", fmt.Errorf("unknown mode: %s", req.Mode)
	}

	switch req.Mode {
	case "table_generate":
		userPrompt = req.Prompt

	case "table_edit":
		if req.Context.ActiveTable == "" {
			return "", "", fmt.Errorf("activeTable is required for table_edit mode")
		}
		userPrompt = fmt.Sprintf("Tableau actuel :\n%s\n\nInstruction : %s", req.Context.ActiveTable, req.Prompt)

	case "text_generate":
		context := req.Context.DocumentContent
		if context == "" {
			context = req.Context.Selection
		}
		if context != "" {
			userPrompt = fmt.Sprintf("Texte existant :\n%s\n\nContinue à partir de là.", context)
		} else {
			userPrompt = req.Prompt
		}

	case "text_refactor":
		if req.Context.Selection == "" {
			return "", "", fmt.Errorf("selection is required for text_refactor mode")
		}
		userPrompt = fmt.Sprintf("Texte à refactoriser :\n%s\n\nInstruction : %s", req.Context.Selection, req.Prompt)

	default:
		userPrompt = req.Prompt
	}

	return sp, userPrompt, nil
}

// ResponseTypeForMode returns the expected response type for a given mode.
func ResponseTypeForMode(mode string) string {
	switch mode {
	case "table_generate", "table_edit":
		return "table_update"
	case "text_generate":
		return "text_insert"
	case "text_refactor":
		return "text_replace"
	default:
		return "text_insert"
	}
}
