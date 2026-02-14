# 🚀 Phase 1 (MVP) : Implementation Technique

Ce document détaille l'implémentation technique de la **Phase 1** du projet Suite2LM, focalisée sur l'éditeur Markdown de base et le moteur de rendu pour les blocs de code JSON en tableaux statiques.

## 1. Objectifs de la Phase 1 (MVP)

*   Mettre en place l'architecture **Local-First** (Frontend + Backend).
*   Créer un éditeur de texte supportant le Markdown standard.
*   Implémenter le rendu visuel (lecture seule) des blocs de code JSON identifiés comme "Smart Tables".
*   Assurer la persistance des données via le système de fichiers local.

---

## 2. Stack Technologique

*   **Frontend :** Next.js (React) avec TypeScript.
    *   *Raison :* Écosystème riche, performance, et facilité d'intégration avec des librairies modernes.
*   **Backend :** Golang avec Gin Gonic.
    *   *Raison :* Performance, binaire unique facile à distribuer, excellente gestion des I/O fichiers.
*   **Éditeur de Texte :** TipTap (basé sur ProseMirror).
    *   *Raison :* Headless (sans UI imposée), très extensible, parfait pour React.
*   **Gestion Markdown :** Serializer/Parser TipTap + Unified/Remark (si besoin de transformations complexes hors éditeur).
*   **Styling :** Tailwind CSS, shadcn/ui.
    *   *Raison :* Rapidité de développement et cohérence visuelle.

---

## 3. Architecture Technique

### A. Structure des Dossiers

```
suite2lm/
├── backend/            # Code Go
│   ├── main.go         # Point d'entrée
│   ├── handlers/       # Gestionnaires API (File System)
│   └── models/         # Structures de données
├── frontend/           # Code Next.js
│   ├── components/     # Composants React (Editor, SmartTable)
│   ├── lib/            # Utilitaires (API Client)
│   └── pages/          # Pages Next.js
├── specs/              # Documentation
└── workspace/          # Dossier racine pour les fichiers utilisateur (par défaut)
```

### B. Flux de Données (Data Flow)

1.  **Chargement :**
    *   Frontend appelle `GET /api/files/:filename`.
    *   Backend lit le fichier `.md` sur le disque.
    *   Frontend reçoit le contenu brut (string).
    *   TipTap désérialise le Markdown en document ProseMirror (JSON interne à TipTap).

2.  **Rendu (Smart Tables) :**
    *   TipTap détecte les blocs de code (`codeBlock`).
    *   Si le langage est `json` ou `smart-table` et que la structure correspond, une **Node View** React personnalisée est rendue à la place du code brut.
    *   Cette vue parse le JSON et affiche un tableau HTML statique.

3.  **Sauvegarde :**
    *   L'utilisateur modifie le texte.
    *   TipTap sérialise le document ProseMirror en Markdown standard.
    *   Frontend appelle `POST /api/files/:name` avec le nouveau contenu.
    *   Backend écrite le fichier sur le disque.

---

## 4. Étapes d'Implémentation

### Étape 1 : Initialisation du Backend (Golang)

*   [ ] Initialiser le module Go (`go mod init suite2lm`).
*   [ ] Installer Gin Gonic (`go get -u github.com/gin-gonic/gin`).
*   [ ] Créer un serveur HTTP basique écoutant sur le port 8080.
*   [ ] Implémenter l'API de gestion de fichiers :
    *   `GET /api/files` : Liste les fichiers `.md` dans le dossier `workspace`.
    *   `GET /api/files/:name` : Lit le contenu d'un fichier.
    *   `POST /api/files/:name` : Écrase le fichier avec le nouveau contenu.
*   [ ] Ajouter la gestion CORS pour permettre les requêtes depuis le Frontend (port 3000).

### Étape 2 : Initialisation du Frontend (Next.js)

*   [ ] Créer le projet Next.js (`npx create-next-app@latest frontend`).
*   [ ] Nettoyer le template par défaut.
*   [ ] Installer les dépendances UI : Tailwind CSS, Lucide React (icônes).
*   [ ] Configurer le proxy ou le client HTTP (Axios/Fetch) pour parler au Backend.

### Étape 3 : Intégration de TipTap (L'Éditeur)

*   [ ] Installer TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-code-block-lowlight`).
*   [ ] Créer un composant `Editor`.
*   [ ] Configurer les extensions de base (Bold, Italic, Heading, List, etc.).
*   [ ] Ajouter une Toolbar simple pour le formatage.
*   [ ] Vérifier la sérialisation/désérialisation Markdown.

### Étape 4 : Le Composant "Smart Table" (Lecture Seule)

*   [ ] Créer un composant React `SmartTableRender` qui prend une chaîne JSON en entrée et affiche un tableau HTML (balises `<table>`, `<thead>`, `<tbody>`).
*   [ ] Créer une **Node View** personnalisée pour TipTap (`CodeBlockJSON`) :
    *   Cette vue doit s'activer lorsque le langage du bloc de code est `json` ou `smart-table`.
    *   Elle doit essayer de parser le contenu du bloc.
    *   Si le parsing réussit, elle affiche `SmartTableRender`.
    *   Si le parsing échoue (JSON invalide), elle affiche le code brut avec une erreur.
*   [ ] Intégrer cette Node View dans l'instance TipTap.

### Étape 5 : Liaison Finale

*   [ ] Sur la page d'accueil, lister les fichiers disponibles via l'API.
*   [ ] Au clic sur un fichier, charger son contenu dans l'éditeur.
*   [ ] Ajouter un bouton "Sauvegarder" (ou autosave) qui appelle l'API de sauvegarde.

---

## 5. Critères de Validation (MVP)

1.  Le backend Go tourne et sert les fichiers locaux.
2.  Le frontend Next.js affiche la liste des fichiers.
3.  On peut ouvrir un fichier Markdown, l'éditer (texte riche) et le sauvegarder.
4.  Un bloc de code JSON valide dans le Markdown s'affiche automatiquement comme un tableau dans l'éditeur.
5.  Le fichier sauvegardé sur le disque reste du Markdown lisible.
