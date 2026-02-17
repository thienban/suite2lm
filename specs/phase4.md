# 🗄️ Phase 4 : Persistance & Moteur de Données (Turso / libSQL)

Ce document définit les spécifications pour l'intégration d'un moteur **Turso (libSQL)** au sein de Suite2LM. Cette étape est cruciale pour transformer l'éditeur de texte en véritable "Moteur de Décision" (cf. Persona Alex), avec une capacité de synchronisation et de passage à l'échelle (Edge).

## 1. Objectifs de la Phase 4

*   **Persistance Robuste :** Dépasser la limite du "tout en mémoire" du frontend.
*   **Moteur SQL Distribué :** Permettre l'exécution de requêtes SQL sur les données des Smart Tables, avec une synchronisation Cloud possible.
*   **Support pour l'IA :** Offrir une structure de données claire (Schéma SQL) pour que l'IA puisse analyser des données complexes sans halluciner.
*   **Réactivité & Edge :** Recalcul instantané des "Variables Dynamiques" dans le texte lors de la modification des tableaux.

---

## 2. Analyse des Besoins (Persona "Alex")

Basé sur le profil d'Alex (Analyste Augmenté) :

| Besoin Utilisateur | Fonctionnalité Technique associée |
| :--- | :--- |
| **"Jongler entre Excel et Word"** | **Tableaux SQL-backed :** Les tableaux dans le document ne sont pas juste du JSON, ce sont des tables SQL virtuelles. |
| **"Mettre à jour son rapport manuellement"** | **Reactive Querying :** Des blocs de texte dynamique `{{SELECT sum(ventes) FROM tables_ventes}}` qui se mettent à jour seuls. |
| **"Parler à son document"** | **Text-to-SQL :** L'IA convertit le langage naturel ("Combien j'ai vendu ?") en SQL exécuté par Turso. |
| **"Données vivantes"** | **Sync Bidirectionnelle :** UI (AG Grid) <-> Turso (Local/Remote) <-> Markdown. |

---

## 3. Architecture Technique : Turso (libSQL)

Compte tenu de la stack (Next.js Frontend + Go Backend), nous optons pour **Turso**, basé sur **libSQL** (un fork de SQLite optimisé pour l'Edge).

### A. Choix d'Implémentation : Embedded Replica

Nous utiliserons les bindings officiels **Turso** (`github.com/tursodatabase/turso/bindings/go`) ou le driver compatible `libsql` pour Go.

*   **Mode Hybride (Embedded Replica) :**
    *   **Local-First :** L'application utilise un fichier de base de données local (comme SQLite standard) pour une latence zéro.
    *   **Sync (Optionnel) :** Si l'utilisateur a un compte Turso, la base locale se synchronise automatiquement avec le cloud (replicas).
    *   **Avantages :** 
        *   Expérience développeur identique à SQLite.
        *   Prêt pour le déploiement "Edge" ou collaboratif sans changer le code.
        *   Compatible avec l'écosystème SQLite existant.

### B. Flux de Données (The Loop)

1.  **Chargement (.md -> libSQL) :**
    *   Au démarrage ou à l'ouverture d'un fichier.
    *   Le parser extrait les blocs `smart-table` (JSON).
    *   Le backend crée/update les tables SQL correspondantes dans la base libSQL locale.

2.  **Interaction (UI -> Backend -> libSQL) :**
    *   L'utilisateur modifie une cellule dans AG Grid.
    *   L'update est envoyé au Backend via WebSocket/API.
    *   Le backend exécute l'UPDATE sur la base locale.
    *   *(Async)* Si configuré, libSQL push les changements vers Turso Cloud.

3.  **Sauvegarde (DB -> .md) :**
    *   Un "Debounced Watcher" surveille la base locale.
    *   Lors de changements, le bloc JSON dans le fichier `.md` original est mis à jour pour garantir que le fichier texte reste la source de vérité ultime (format de fichier).

4.  **Interrogation (IA/Variables -> libSQL) :**
    *   L'IA ou les variables dynamiques exécutent des `SELECT` sur la base.

---

## 4. Spécifications Fonctionnelles détaillées

### 1. Gestionnaire de Base de Données (DB Manager)
*    **Connexion :** `libsql://` (remote) ou `file://` (local).
*   **Mapping Automatique :**
    *   Une Smart Table avec `id: "ventes_2024"` devient la table SQL `ventes_2024`.
    *   Les colonnes sont typées (TEXT, INTEGER, REAL) selon le schéma de la Smart Table.

### 2. Le "Data Context" pour l'IA
*   Avant chaque requête LLM, le système génère le schéma de la base :
    ```sql
    CREATE TABLE ventes_2024 (produit TEXT, qte INTEGER, prix REAL);
    -- 45 rows
    ```
*   Ce contexte est injecté dans le System Prompt.
*   L'IA peut répondre par une requête SQL, que le système exécute et dont il renvoie le résultat JSON ou Texte.

### 3. Variables Dynamiques (AI-First SQL)
*   **Concept :** L'utilisateur ne tape plus de SQL brut. Il demande une donnée en langage naturel.
*   **Workflow :**
    1.  Commande Slash `/data` ou bouton "Ask Data".
    2.  Modal : "Que voulez-vous savoir ?" (ex: "Chiffre d'affaires total 2024").
    3.  L'IA génère le SQL (`SELECT sum(ca) FROM ventes_2024`) en arrière-plan.
    4.  Insertion d'un composant `DynamicValue` qui stocke la requête mais affiche le résultat.
*   **Visualisation :** Afficher l'ID/Nom des tableaux au survol pour aider le contexte.
*   **Fallback :** Mode "Expert" pour éditer le SQL manuellement si besoin (caché par défaut).

---

## 5. Plan d'Implémentation (Roadmap Phase 4)

### Étape 1 : Backend - Intégration Turso/libSQL (FAIT)
*   [x] Installer le driver Go pour libSQL.
*   [x] Créer un service `DatabaseManager`.
*   [x] Implémenter la logique locale.

### Étape 2 : API de Synchronisation (FAIT)
*   [x] Endpoint `POST /api/db/sync`.
*   [x] Endpoint `POST /api/db/query`.

### Étape 3 : Intégration IA (Text-to-SQL)
*   [ ] Mettre à jour le prompt système pour `text_to_sql` (Fait, à affiner avec le contexte du schéma).
*   [ ] Endpoint pour demander une génération de SQL à l'IA.

### Étape 4 : Frontend - Interface "Ask Data"
*   [x] **Slash Command :** Ajouter `/data` au menu.
*   [x] **Modal de Requête :**
    *   Input texte pour la question en langage naturel.
    *   Bouton "Générer".
    *   Preview du résultat.
*   [x] **Composant `DynamicValue` :**
    *   Refactor : Cacher le SQL par défaut.
    *   Afficher un indicateur de chargement/erreur élégant.

### Étape 5 : Front-end - Affichage de la base de données
*   [X] **Affichage des tables :**
    *   Afficher les tables de la base de données.
    *   Afficher les colonnes de chaque table.
    *   Afficher les données de chaque table.
    [] **Sécurise les API `api/db/`:**
     *  securise les endpoints /api/db/tables et /api/db/data
     *  DynamicValue

     ### Étape 6 : Améliration du gestion appel API
     * Front-end: Utilise librarie tanstack-query pour gérer les appels API
     * Back-end: Utilise librarie sqlx

---

## 6. Risques & Mitigations

*   **Injection SQL :** Les requêtes venant du frontend ou de l'IA doivent être strictement encadrées (ou tourner sur une DB isolée/éphémère sans accès système).
*   **Conflits de Sync :** Si l'utilisateur modifie le .md manuellement pendant que la DB tourne. -> La source de vérité reste le fichier .md au chargement.
*   **Latence Réseau (Mode Remote) :** Si on utilise Turso Cloud directement. -> Privilégier le mode "Embedded Replica" ou fichier local pour la rapidité de l'UI.
