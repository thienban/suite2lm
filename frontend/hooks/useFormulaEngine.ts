import { Parser } from 'expr-eval';
import { useMemo } from 'react';

import { roundToTwo } from '@/lib/utils';
import type { SmartTableColumn } from '@/types/smart-table.types';

// ─── Shared parser instance ─────────────────────────────────
const parser = new Parser();

/**
 * Transform bracket-syntax expression to plain variable names.
 * "[prix] * [quantite]" → "prix * quantite"
 */
const stripBrackets = (expression: string): string =>
    expression.replace(/\[(\w+)\]/g, '$1');

/**
 * Evaluate a single formula expression against a row's values.
 * Returns the computed number or an error string.
 */
const evaluateExpression = (
    expression: string,
    row: Record<string, unknown>
): number | string => {
    try {
        const cleanExpr = stripBrackets(expression);
        const compiled = parser.parse(cleanExpr);

        // Build variables: only pass numeric values from the row
        const variables: Record<string, number> = {};
        for (const [key, val] of Object.entries(row)) {
            const num = Number(val);
            if (!isNaN(num)) {
                variables[key] = num;
            }
        }

        const result = compiled.evaluate(variables);
        if (typeof result !== 'number' || !isFinite(result)) {
            return '#ERR';
        }
        return roundToTwo(result);
    } catch {
        return '#ERR';
    }
};

// ─── Hook ───────────────────────────────────────────────────

interface UseFormulaEngineProps {
    schema: SmartTableColumn[];
    data: Record<string, unknown>[];
}

/**
 * Computes formula column values for each row.
 * Returns `computedData` — the original data enriched with calculated values.
 */
export const useFormulaEngine = ({ schema, data }: UseFormulaEngineProps): Record<string, unknown>[] => {
    // Identify formula columns
    const formulaColumns = useMemo(
        () => schema.filter(col => col.type === 'formula' && col.expression),
        [schema]
    );

    // Compute values
    const computedData = useMemo(() => {
        if (formulaColumns.length === 0) return data;

        return data.map(row => {
            const enriched = { ...row };
            for (const col of formulaColumns) {
                enriched[col.key] = evaluateExpression(col.expression!, row);
            }
            return enriched;
        });
    }, [data, formulaColumns]);

    return computedData;
};
