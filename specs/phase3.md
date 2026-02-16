# 🚀 Phase 3 : Intelligence — Barre de Commande IA

Ce document détaille les spécifications fonctionnelles et techniques de la **Phase 3** du projet Suite2LM, visant à intégrer une barre de commande IA permettant de manipuler la structure du document et des données via le langage naturel.

## 1. Objectifs de la Phase 3

*   **Barre de Commande Universelle (`Cmd+K` / `/`) :** Un point d'entrée unique pour interagir avec l'IA depuis l'éditeur.
*   **Manipulation Structurelle par IA :** Générer, modifier, enrichir les Smart Tables via des instructions textuelles.
*   **Ghostwriting contextuel :** Suggestions de texte inline (autocomplétion longue) basées sur le contexte du document.
*   **Refactorisation de texte :** Sélection d'un bloc → transformation par l'IA (ton, résumé, traduction).
*   **Streaming des réponses :** Affichage progressif des résultats IA pour une UX fluide.

---

## 2. Spécifications Fonctionnelles

### A. Barre de Commande (Command Bar)

L'utilisateur peut invoquer la barre de commande à tout moment dans l'éditeur.

*   **Déclenchement :**
    *   `Cmd+K` (macOS) / `Ctrl+K` (Windows) : Ouvre un dialog flottant au niveau du curseur.
    *   `/` en début de ligne : Ouvre un menu slash inline (style Notion).
*   **Modes de la commande :**
    *   **Mode Libre :** L'utilisateur tape une instruction en langage naturel.
    *   **Mode Slash (Menu) :** Commandes prédéfinies avec autocomplétion :
        *   `/tableau` — Génère une Smart Table à partir d'une description.
        *   `/résumer` — Résume le texte sélectionné ou le document.
        *   `/traduire` — Traduit le texte sélectionné.
        *   `/trier` — Trie un tableau selon un critère sémantique.
        *   `/colonne` — Ajoute une colonne calculée à un tableau.
        *   `/formater` — Change le ton ou le style du texte.

### B. Manipulation IA des Smart Tables

*   **Génération :** *"Crée un tableau de suivi de stock pour une boulangerie"* → L'IA génère un code block JSON avec colonnes et données d'exemple.
*   **Enrichissement :** *"Ajoute une colonne TVA à 20% basée sur Prix HT"* → L'IA lit le tableau courant, calcule et insère la colonne.
*   **Tri sémantique :** *"Trie par urgence de réapprovisionnement"* → L'IA réordonne les lignes selon un critère complexe.
*   **Transformation :** *"Transforme ce paragraphe en tableau de tâches"* → Extraction de données depuis du texte libre.

### C. Ghostwriting (Autocomplétion IA)

*   **Déclenchement :** Après une pause de frappe (~1.5s), si le curseur est en fin de paragraphe.
*   **Affichage :** Texte suggestif en gris clair après le curseur.
*   **Validation :** `Tab` pour accepter, continuer à taper pour ignorer.
*   **Contexte :** L'IA reçoit les ~2000 derniers tokens du document pour proposer une suite cohérente.

### D. Refactorisation de Texte

*   L'utilisateur sélectionne du texte → `Cmd+K` → *"Rends ce texte plus diplomatique"*.
*   Le texte sélectionné est remplacé par la version retravaillée.
*   Possibilité d'annuler via `Cmd+Z` (undo TipTap).

---

## 3. Spécifications Techniques

### A. Architecture LLM

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
│                                                  │
│  CommandBar ──→ useAICommand() ──→ POST /api/ai  │
│  GhostWriter ──→ useGhostwrite() ──→ SSE stream │
│                                                  │
└───────────────────────┬─────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────┴─────────────────────────┐
│                  Backend (Golang / Gin)           │
│                                                  │
│  POST /api/ai/command ──→ AI Handler             │
│  GET  /api/ai/suggest  ──→ AI Suggest (SSE)      │
│                                                  │
│  AI Handler:                                     │
│    1. Reçoit { prompt, context, mode }           │
│    2. Construit le system prompt + contexte      │
│    3. Appelle l'API LLM (OpenAI / Gemini / etc.) │
│    4. Retourne le résultat (JSON ou texte)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### B. Stack Technique (Nouvelles dépendances)

*   **Frontend :**
    *   `cmdk` — Composant de command palette (headless, compatible Shadcn).
    *   TipTap `Extension` custom pour le slash menu et les décorations ghostwrite.
*   **Backend :**
    *   Module Go `ai/` — Service d'orchestration des appels LLM.
    *   Support **SSE** (Server-Sent Events) via Gin pour le streaming.
    *   Variable d'environnement `LLM_API_KEY` et `LLM_PROVIDER` (openai | gemini | anthropic).

### C. API Backend — Nouveaux Endpoints

#### `POST /api/ai/command`

Exécute une commande IA sur le contenu du document.

```json
// Request
{
  "prompt": "Ajoute une colonne TVA à 20% basée sur Prix HT",
  "context": {
    "documentContent": "...",
    "selection": "...",
    "cursorPosition": 42,
    "activeTable": { ... }
  },
  "mode": "table_edit" // "table_edit" | "text_generate" | "text_refactor" | "table_generate"
}
```

```json
// Response
{
  "type": "table_update",
  "content": "[[\"Produit\",\"Prix HT\",\"TVA\",\"Prix TTC\"],[\"Pain\",1.00,0.20,1.20]]",
  "message": "Colonne TVA ajoutée avec un taux de 20%."
}
```

#### `GET /api/ai/suggest?context=...`

Retourne une suggestion de texte via SSE (streaming).

```
event: token
data: {"token": "Le"}

event: token
data: {"token": " prochain"}

event: done
data: {"fullText": "Le prochain trimestre sera…"}
```

### D. Architecture Frontend — Composants

```
components/
├── ai/
│   ├── CommandBar.tsx          # Dialog Cmd+K (utilise cmdk)
│   ├── SlashMenu.tsx           # Menu inline déclenché par "/"
│   ├── GhostWriter.tsx         # Extension TipTap pour suggestions inline
│   └── AIResultPreview.tsx     # Preview du résultat IA avant insertion
├── editor/
│   ├── editor.tsx              # (existant) — ajouter les extensions IA
│   ├── SmartTable/             # (existant)
│   └── SmartTableEditable/     # (existant)
hooks/
├── useAICommand.ts             # Appel POST /api/ai/command
├── useGhostwrite.ts            # Gestion SSE pour les suggestions
└── use-workspace.ts            # (existant)
```

### E. Intégration avec TipTap

1.  **Slash Menu Extension :** Extension TipTap qui écoute la saisie de `/` en début de bloc et affiche le menu.
2.  **GhostWrite Extension :** Extension TipTap utilisant les `Decorations` pour afficher le texte suggestif non-éditable avec un style gris clair.
3.  **CommandBar :** Composant React indépendant (non TipTap), communique avec l'éditeur via les commandes TipTap (`editor.commands`).

### F. Prompt Engineering

Le backend construira des system prompts adaptés au mode :

| Mode | System Prompt (résumé) |
|---|---|
| `table_generate` | *"Tu es un assistant qui génère des tableaux de données au format JSON (array of arrays). La première ligne contient les headers."* |
| `table_edit` | *"Voici un tableau JSON. Applique la modification demandée et retourne le tableau complet modifié."* |
| `text_generate` | *"Continue le texte suivant de manière naturelle et cohérente. Réponds uniquement avec le texte de continuation."* |
| `text_refactor` | *"Réécris le texte suivant selon l'instruction donnée. Conserve le sens mais adapte le style."* |

---

## 4. Étapes d'Implémentation

### Étape 1 : Backend IA — Service LLM
*   [x] Créer le module `backend/ai/` avec un service générique d'appel LLM.
*   [x] Implémenter le support multi-provider (OpenAI, Gemini) via interface Go.
*   [x] Ajouter l'endpoint `POST /api/ai/command`.
*   [x] Gérer la configuration via `.env` (`LLM_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`).

### Étape 2 : Frontend — Command Bar (`Cmd+K`)
*   [x] Installer `cmdk` et créer le composant `CommandBar.tsx`.
*   [x] Intégrer le raccourci `Cmd+K` / `Ctrl+K` dans l'éditeur.
*   [x] Créer le hook `useAICommand.ts` pour appeler le backend.
*   [x] Afficher un preview du résultat IA avant insertion dans le document.

### Étape 3 : Slash Menu dans TipTap
*   [x] Créer l'extension TipTap `SlashMenu` qui détecte `/` en début de bloc.
*   [x] Afficher un menu avec les commandes prédéfinies (`/tableau`, `/résumer`, etc.).
*   [x] Connecter chaque commande au hook `useAICommand`.

### Étape 4 : Manipulation IA des Smart Tables
*   [X] Selection du tableau
*   [X] Passer le contenu JSON du tableau comme contexte à la commande IA.
*   [X] Appliquer le résultat IA (nouveau JSON) directement dans le noeud TipTap.
*   [X] Gérer les cas d'erreur (JSON invalide retourné, timeout).

### Étape 5: Structure des données
Revoir la structure des données pour les Smart Tables
metadata, schema, data. Voir workspace/welcome.md
*   [X] Backend
*   [X] Frontend

### Étape 6: Colonnes à formules
Implémenter un moteur d'évaluation de formules pour les colonnes de type `formula` dans les Smart Tables.
*   [x] Parser les expressions de formules (ex: `amount_ht * (1 + tax_rate)`)
*   [x] Évaluer les formules en temps réel lors de modifications de cellules
*   [x] Affichage en lecture seule des colonnes calculées dans AG Grid
*   [x] Gestion des erreurs de formules (référence circulaire, division par zéro)
*   [x] Formule modifiable par l'utilisateur
*   [x] Aide à la saisie de formule (liste des colonnes disponibles)
*   [X] Ajouter une colonne de type formule. Il peut saisir une formule comme `=A1+B1`.
*   [X] Ajouter une colonne de type selection. Les options sont définies par l'utilisateur.

----------------------------------

## 5. Sécurité & Configuration

*   **Clé API :** Stockée uniquement côté backend (`.env`), jamais exposée au frontend.
*   **Rate Limiting :** Limiter les appels IA à ~10 req/min par utilisateur (côté backend).
*   **Validation :** Le backend valide que le JSON retourné par l'IA est syntaxiquement correct avant de le renvoyer au frontend.
*   **Fallback :** Si l'appel LLM échoue, retourner un message d'erreur clair sans casser l'éditeur.

### Étape 5: Structure des données

-------------------------------------

## 6. Critères de Validation (Phase 3)

1.  `Cmd+K` ouvre une barre de commande fonctionnelle dans l'éditeur.
2.  Une commande textuelle comme *"Crée un tableau de produits"* insère une Smart Table générée par l'IA.
3.  Un tableau existant peut être enrichi via la commande IA (ajout de colonne calculée).
4.  Le slash menu (`/`) propose des commandes prédéfinies et les exécute.
5.  Le texte sélectionné peut être refactorisé par l'IA via `Cmd+K`.
6.  Les appels IA échoués n'impactent pas la stabilité de l'éditeur.

## Options en Backlog

### Ghostwriting (Autocomplétion IA)
*   [ ] Ajouter l'endpoint SSE `GET /api/ai/suggest` au backend.
*   [ ] Créer le hook `useGhostwrite.ts` avec gestion SSE.
*   [ ] Créer l'extension TipTap `GhostWriter` avec `Decorations` pour le texte fantôme.
*   [ ] Implémenter `Tab` pour accepter, `Escape` pour rejeter.

### Refactorisation de Texte
*   [ ] Détecter la sélection de texte dans l'éditeur.
*   [ ] Passer le texte sélectionné via `Cmd+K` avec mode `text_refactor`.
*   [ ] Remplacer la sélection par le résultat IA.
*   [ ] S'assurer que l'undo TipTap (`Cmd+Z`) fonctionne correctement.