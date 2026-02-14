# 🚀 Phase 2 : Interaction & Édition Bidirectionnelle

Ce document détaille les spécifications fonctionnelles et techniques de la **Phase 2** du projet Suite2LM, visant à transformer les tableaux statiques en grilles de données éditables et connectées.

## 1. Objectifs de la Phase 2

*   **Édition "In-Place" :** Permettre à l'utilisateur de modifier les données directement dans le tableau (façon Excel/Airtable) sans toucher au JSON brut.
*   **Synchronisation Bidirectionnelle :**
    *   Modification Grille -> Mise à jour du Code Block JSON.
    *   Modification Code Block -> Mise à jour de la Grille.
*   **Manipulation Structurelle :** Ajouter/Supprimer des lignes et colonnes via l'interface graphique.
*   **Validation :** Assurer que les données saisies respectent le format JSON attendu.

---

## 2. Spécifications Fonctionnelles

### A. Interface Tableur (Grid UI)
L'affichage "Preview" actuel (tableau HTML simple) est remplacé par un composant interactif.

*   **Navigation :** Déplacement au clavier (Flèches, Tab, Entrée).
*   **Édition Cellule :**
    *   Double-clic ou Entrée sur une cellule passe en mode édition (Input text).
    *   Échap annule, Entrée valide.
*   **Menu Contextuel (Clic Droit) :**
    *   *Insérer ligne au-dessus / en-dessous*.
    *   *Insérer colonne à gauche / à droite*.
    *   *Supprimer la ligne / colonne*.
*   **Types de Données (MVP) :** Texte et Nombres uniquement.

### B. Synchronisation
*   Toute modification dans la grille met à jour **immédiatement** le bloc de code sous-jacent.
*   Si l'utilisateur repasse en mode "Source" (bouton existant), il voit le JSON à jour.

---

## 3. Spécifications Techniques

### A. Stack Frontend (Évolution)

*   **Composant Grille :** `TanStack Table` (v8).
    *   *Raison :* Headless (non style-agnostic), performant, et permet une intégration parfaite avec **Shadcn UI**. Contrairement à des solutions "clés en main" (AG Grid), elle permet de garder un bundle léger et un look 100% custom.
*   **Gestion d'État :** Local state dans le composant React, propagé vers TipTap.

### B. Architecture du Composant `SmartTableEditable`

Le composant `SmartTableRender` sera renommé ou étendu en `SmartTableEditable`.

```tsx
interface SmartTableEditableProps {
  initialContent: string; // JSON string
  updateContent: (newContent: string) => void; // Callback vers TipTap
}
```

**Logique de flux de données :**
1.  **Parsing :** Au montage, le JSON `initialContent` est parsé en objet JS local (state `data`).
2.  **Rendu :** TanStack Table rend la grille basée sur `data`.
3.  **Édition :**
    *   `onCellEdit` met à jour le state local `data`.
    *   Un `useEffect` ou le handler d'édition sérialise `data` en JSON.
    *   Appel de `updateContent(jsonString)`.
4.  **TipTap Update :** La fonction `updateContent` utilise `updateAttributes` (ou une transaction ProseMirror) pour remplacer le texte du noeud CodeBlock.

### C. Gestion des Erreurs
*   Si le JSON source est invalide (modifié manuellement avec erreur de syntaxe), la vue bascule automatiquement en mode "Source" avec une alerte, empêchant le mode Grille jusqu'à correction.

---

## 4. Étapes d'Implémentation

### Étape 1 : Mise en place de TanStack Table
*   [ ] Installer `@tanstack/react-table`.
*   [ ] Créer un composant de base `DataTable` avec Shadcn UI.

### Étape 2 : Rendre la Table Éditable
*   [ ] Créer une cellule éditable (`EditableCell`).
*   [ ] Gérer le state des données via `useState` ou un store léger.
*   [ ] Implémenter la logique de mise à jour d'une cellule `rowIndex, colId`.

### Étape 3 : Intégration TipTap (Bidirectionnel)
*   [ ] Modifier `SmartTableExtension` pour passer une fonction de callback (`updateNodeContent`) au composant React.
*   [ ] Dans le composant React, déclencher ce callback à chaque modification de la grille (avec debounce si nécessaire pour la performance).

### Étape 4 : Actions de Structure (Lignes/Colonnes)
*   [ ] Ajouter des boutons ou un menu contextuel pour `addRow`, `addColumn`.
*   [ ] Mettre à jour le tableau de données en conséquence.

---

## 5. Exemple de Structure JSON (Rappel)

Le format reste des tableaux de tableaux pour la densité, ou tableaux d'objets pour la lisibilité. L'implémentation doit supporter les deux, mais privilégiera le format **Tableau de Tableaux** pour l'écriture par l'IA (moins de tokens).

```json
[
  ["Produit", "Prix", "Stock"],
  ["Pain", 1.20, 50],
  ["Croissant", 1.10, 30]
]
```
