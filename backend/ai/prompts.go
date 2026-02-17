package ai

import "fmt"

// System prompts for each AI mode.
var systemPrompts = map[string]string{
	"table_generate": `Tu es un assistant spécialisé dans la génération de tableaux de données structurés.
Génère un tableau au format JSON structuré avec metadata, schema et data.
Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans explication.

Format attendu :
{
  "metadata": {
    "id": "tab_xxx",
    "title": "Titre du tableau",
    "description": "Description courte"
  },
  "schema": [
    { "key": "nom_colonne", "label": "Nom Affiché", "type": "text" }
  ],
  "data": [
    { "nom_colonne": "valeur" }
  ]
}

Types de colonnes disponibles : text, number, currency, percentage, select, date, formula.
Pour "currency", ajoute "unit": "EUR" (ou autre devise).
Pour "select", ajoute "options": ["opt1", "opt2"].
Pour "percentage", les valeurs sont des décimaux (0.20 = 20%).
Pour "formula", ajoute "expression": "[col_key] * [other_key]" (utilise les crochets autour des noms de colonnes).
Les colonnes formula ne doivent PAS avoir de valeurs dans data — elles sont calculées automatiquement.
Génère toujours un "id" unique commençant par "tab_".`,

	"table_edit": `Tu es un assistant spécialisé dans la modification de tableaux de données structurés.
On te fournit un tableau au format JSON structuré { metadata, schema, data }.
Applique la modification demandée et retourne le tableau complet modifié.

RÈGLES STRICTES :
- Retourne UNIQUEMENT le tableau modifié au même format { metadata, schema, data }.
- Conserve le metadata.id original.
- Mets à jour metadata.last_ai_action avec une courte description de ce que tu as fait.
- Pas de markdown, pas de backticks, pas d'explication, pas de texte avant ou après le JSON.
- Le résultat doit commencer par { et finir par }.
- Tu peux modifier le schema (ajouter/modifier des colonnes) si l'instruction le demande.
- Types disponibles : text, number, currency, percentage, select, date, formula.
- Pour "formula", utilise "expression": "[col_key] * [other_key]" (crochets autour des clés).
- Ne mets jamais de valeurs calculées dans data pour les colonnes formula.`,

	"text_generate": `Tu es un assistant d'écriture.
Continue le texte fourni de manière naturelle et cohérente.
Réponds UNIQUEMENT avec le texte de continuation, sans préfixe ni explication.
Écris en français sauf si le texte source est dans une autre langue.`,

	"text_refactor": `Tu es un assistant d'écriture spécialisé dans la refactorisation de texte.
Réécris le texte fourni selon l'instruction donnée.
Conserve le sens original mais adapte le style selon la demande.
Réponds UNIQUEMENT avec le texte réécrit, sans préfixe ni explication.`,

	"text_to_sql": `Tu es un expert SQL.
Ta tâche est de convertir une question en langage naturel en une requête SQL (SELECT uniquement) compatible SQLite/libSQL.
On te fournira le schéma de la base de données.
Réponds UNIQUEMENT avec la requête SQL brute, sans markdown, sans explication.`,
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

	case "text_to_sql":
		// We expect the schema to be passed in the context (e.g. via ActiveTable or a new field)
		// For now, let's assume ActiveTable holds the schema or DDL
		if req.Context.ActiveTable == "" {
			// Fallback: if no schema provided, maybe just try? But improved with DDL
			userPrompt = req.Prompt
		} else {
			userPrompt = fmt.Sprintf("Schéma SQL :\n%s\n\nQuestion : %s", req.Context.ActiveTable, req.Prompt)
		}

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
	case "text_to_sql":
		return "sql_query"
	default:
		return "text_insert"
	}
}
