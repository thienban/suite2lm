

# 📄 Conception : Suite2LM - Éditeur LLM-Native

Ce document définit les spécifications fonctionnelles et techniques pour un logiciel d'édition de texte et de données conçu spécifiquement pour l'ère des Large Language Models (LLM).

## 1. Vision du Produit

L'objectif est de créer un environnement de travail où l'IA n'est pas un assistant externe (copilot), mais le **moteur de structure**. L'application utilise le **Markdown (.md)** comme format pivot pour garantir la portabilité, la transparence et une compréhension maximale par les LLM.

---

## 2. Architecture du Format de Fichier (Hybride)

Pour concilier "lisibilité humaine" et "manipulation de données structurées", l'application utilise une structure hybride au sein du fichier `.md`.

### Structure du document :

* **Corps de texte :** Markdown standard (`#`, `**`, `>`).
* **Blocs de données (Smart Tables) :** Encapsulés dans des balises de code spécifiques (ex: `json` ou `csv` avec métadonnées) que l'interface interprète en tableur interactif.

> **Exemple de stockage interne :**
> ```markdown
> # Rapport de Projet
> Voici les données financières :
> 
> ```
> 
> 

> ```smart-table
> {
>   "id": "table_001",
>   "config": {"currency": "EUR", "frozen_rows": 1},
>   "data": [
>     ["Poste", "Budget", "Statut"],
>     ["Développement", 5000, "En cours"]
>   ]
> }
> 
> ```
> 
> 

---

## 3. Fonctionnalités Clés

### A. Le Tableur Intelligent (Data-to-UI)

* **Initialisation "Tableau Blanc" :** L'utilisateur décrit son besoin (*"Crée un tableau de suivi de stock pour une boulangerie"*). L'IA génère le schéma (colonnes) et des exemples de données.
* **Manipulation sémantique :** * *Tri intelligent :* "Trie par urgence de réapprovisionnement."
* *Calculs naturels :* "Ajoute une colonne de TVA à 20% sur la base du prix HT."


* **Rendu interactif :** Une grille (type Excel) permet l'édition manuelle qui met à jour le JSON/CSV source en temps réel.

### B. L'Éditeur de Texte Sémantique

* **Ghostwriting contextuel :** L'IA suggère des suites de phrases en gris clair (autocomplétion longue).
* **Refactorisation de texte :** Sélection d'un bloc -> "Change le ton pour être plus diplomatique" -> Le Markdown est réécrit.
* **Extraction de données :** "Transforme ce compte-rendu de réunion en tableau de tâches (Smart Table)."

### C. La Barre de Commande Universelle

* Un point d'entrée unique (`Cmd+K` ou `/`) pour :
1. Générer des structures.
2. Modifier le formatage.
3. Interroger le document ("Quelle était la conclusion du chapitre 2 ?").



---

## 4. Spécifications Techniques (Stack recommandée)

* **Frontend :** NextJS.
* **Backend :** Golang, Gin Gonic.
* **Database :** PostgreSQL.
* **LLM Orchestrator :** LangChain Go (pour gérer les appels API et le streaming).
* **Moteur d'édition :** TipTap ou Lexical (Frameworks d'édition riches et extensibles).
* **Gestion Markdown :** Unified.js / Remark (pour parser et transformer le MD).
* **Stockage local :** Fichiers système (Local First) pour la confidentialité et la rapidité.

---

## 5. Expérience Utilisateur (UX)

| Étape | Action Utilisateur | Réponse de l'App |
| --- | --- | --- |
| **Démarrage** | Page blanche. | Propose : "Écrire un mémo", "Créer un inventaire", "Importer un CSV". |
| **Création** | Tape "/Tableau" + description. | Génère une grille visuelle avec des colonnes pertinentes. |
| **Édition** | Modifie une valeur dans la grille. | Met à jour silencieusement le bloc de données dans le fichier `.md`. |
| **Export** | Clic sur "Partager". | Propose le `.md` brut, un PDF mis en forme, ou un lien web dynamique. |

---

## 6. Roadmap de Développement

1. **Phase 1 (MVP) :** Éditeur Markdown de base + moteur de rendu pour les blocs de code JSON en tableaux statiques.
2. **Phase 2 (Interaction) :** Rendre les tableaux éditables (Grid UI) avec synchronisation bidirectionnelle.
3. **Phase 3 (Intelligence) :** Intégration de la barre de commande IA pour manipuler la structure (ajouter/supprimer/calculer).
4. **Phase 4 (Écosystème) :** Gestion multi-fichiers et recherche sémantique entre les documents.
