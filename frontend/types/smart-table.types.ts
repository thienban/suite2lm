// ─── Smart Table Data Structure ─────────────────────────────
// Structured format: { metadata, schema, data }
// See workspace/welcome.md for reference

export interface SmartTableMetadata {
    id: string;
    title: string;
    description?: string;
    last_ai_action?: string;
}

export type ColumnType = 'text' | 'number' | 'currency' | 'percentage' | 'select' | 'date' | 'formula';

export interface SmartTableColumn {
    key: string;
    label: string;
    type: ColumnType;
    options?: string[];   // for "select" type
    unit?: string;        // for "currency" type (e.g. "EUR")
    default?: unknown;    // default value for new rows
    expression?: string;  // for "formula" type — e.g. "[prix] * [quantite]"
}

export interface SmartTableDocument {
    metadata: SmartTableMetadata;
    schema: SmartTableColumn[];
    data: Record<string, unknown>[];
}

// ─── Helpers ────────────────────────────────────────────────

/** Generate a random table ID */
export const generateTableId = (): string =>
    `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Create a default empty SmartTableDocument */
export const createEmptySmartTable = (title = 'Nouveau Tableau'): SmartTableDocument => ({
    metadata: {
        id: generateTableId(),
        title,
    },
    schema: [
        { key: 'col_1', label: 'Colonne 1', type: 'text' },
        { key: 'col_2', label: 'Colonne 2', type: 'text' },
    ],
    data: [
        { col_1: '', col_2: '' },
    ],
});

/** Check if a parsed JSON object is in the structured format */
export const isSmartTableDocument = (obj: unknown): obj is SmartTableDocument => {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return (
        typeof o.metadata === 'object' &&
        o.metadata !== null &&
        Array.isArray(o.schema) &&
        Array.isArray(o.data)
    );
};
