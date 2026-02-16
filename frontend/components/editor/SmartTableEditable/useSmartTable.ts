import {
    type ColumnType,
    isSmartTableDocument,
    type SmartTableColumn,
    type SmartTableDocument,
    type SmartTableMetadata,
} from '@/types/smart-table.types';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Parse content string into a SmartTableDocument ─────────
const parseContent = (content: string): { doc?: SmartTableDocument; error?: string } => {
    try {
        const json = JSON.parse(content);

        if (isSmartTableDocument(json)) {
            return { doc: json };
        }

        return { error: 'Format invalide : le JSON doit contenir metadata, schema et data.' };
    } catch (e) {
        return { error: (e as Error).message };
    }
};

// ─── Hook ───────────────────────────────────────────────────

interface UseSmartTableProps {
    content: string;
    onUpdate: (newContent: string) => void;
}

export const useSmartTable = ({ content, onUpdate }: UseSmartTableProps) => {
    const [doc, setDoc] = useState<SmartTableDocument | null>(null);
    const [error, setError] = useState<string | null>(null);

    const docRef = useRef<SmartTableDocument | null>(doc);

    // ── Initialize from content ──
    useEffect(() => {
        const result = parseContent(content);
        if (result.error) {
            setError(result.error);
        } else if (result.doc) {
            setError(null);
            const newStr = JSON.stringify(result.doc);
            const curStr = JSON.stringify(docRef.current);
            if (newStr !== curStr) {
                setDoc(result.doc);
                docRef.current = result.doc;
            }
        }
    }, [content]);

    // Keep ref in sync
    useEffect(() => {
        docRef.current = doc;
    }, [doc]);

    // ── Serialize and push to editor ──
    const updateParent = useCallback((updatedDoc: SmartTableDocument) => {
        const jsonString = JSON.stringify(updatedDoc, null, 2);
        onUpdate(jsonString);
    }, [onUpdate]);

    // ── Auto-sync to DB (Debounced) ──
    useEffect(() => {
        if (!doc) return;

        const timer = setTimeout(() => {
            fetch('http://localhost:8080/api/db/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc.metadata ? { ...doc.metadata, schema: doc.schema, data: doc.data } : { id: 'unknown', schema: doc.schema, data: doc.data }),
            }).catch(err => console.error('Failed to sync table to DB:', err));
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [doc]);

    // ── Convenience: update just the data rows ──
    const updateData = useCallback((newData: Record<string, unknown>[]) => {
        const current = docRef.current;
        if (!current) return;
        const updated = { ...current, data: newData };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    // ── Cell update ──
    const handleCellUpdate = useCallback((rowIndex: number, columnKey: string, value: unknown) => {
        const current = docRef.current;
        if (!current) return;
        const newData = [...current.data];
        newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
        updateData(newData);
    }, [updateData]);

    // ── Row operations ──
    const addRow = useCallback((index: number, where: 'before' | 'after') => {
        const current = docRef.current;
        if (!current) return;
        const newData = [...current.data];
        const insertIndex = where === 'before' ? index : index + 1;

        // Create empty row from schema
        const newRow: Record<string, unknown> = {};
        current.schema.forEach(col => {
            newRow[col.key] = col.default ?? '';
        });

        newData.splice(insertIndex, 0, newRow);
        updateData(newData);
    }, [updateData]);

    const deleteRow = useCallback((index: number) => {
        const current = docRef.current;
        if (!current) return;
        const newData = [...current.data];
        newData.splice(index, 1);
        updateData(newData);
    }, [updateData]);

    // ── Column operations ──
    const addColumn = useCallback((colIndex: number, where: 'before' | 'after', name: string, type: ColumnType = 'text', options?: string[]) => {
        const current = docRef.current;
        if (!current) return;

        // Generate safe key
        let key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (!key) key = `col_${Date.now()}`;

        // Ensure uniqueness
        let counter = 1;
        const baseKey = key;
        while (current.schema.some(c => c.key === key)) {
            key = `${baseKey}_${counter}`;
            counter++;
        }

        const newCol: SmartTableColumn = { key, label: name, type, options };

        // Initialize default value based on type
        // Formula columns get null (computed), others get empty/zero
        const defaultValue = type === 'formula' ? null : (
            type === 'number' || type === 'currency' || type === 'percentage' ? 0 : ''
        );

        const newSchema = [...current.schema];
        const insertIndex = where === 'before' ? colIndex : colIndex + 1;
        newSchema.splice(insertIndex, 0, newCol);

        const newData = current.data.map(row => ({
            ...row,
            [key]: defaultValue
        }));

        const updated = { ...current, schema: newSchema, data: newData };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    const deleteColumn = useCallback((colIndex: number) => {
        const current = docRef.current;
        if (!current) return;
        if (colIndex < 0 || colIndex >= current.schema.length) return;

        const keyToDelete = current.schema[colIndex].key;
        const newSchema = current.schema.filter((_, i) => i !== colIndex);
        const newData = current.data.map(row => {
            const { [keyToDelete]: _, ...rest } = row;
            return rest;
        });

        const updated = { ...current, schema: newSchema, data: newData };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    // ── Header (label) update ──
    const handleHeaderUpdate = useCallback((colIndex: number, newLabel: string) => {
        const current = docRef.current;
        if (!current) return;

        const newSchema = [...current.schema];
        newSchema[colIndex] = { ...newSchema[colIndex], label: newLabel };

        const updated = { ...current, schema: newSchema };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    // ─── Column Schema update (e.g. formula expression) ──
    const updateColumn = useCallback((key: string, updates: Partial<SmartTableColumn>) => {
        const current = docRef.current;
        if (!current) return;

        const colIndex = current.schema.findIndex(c => c.key === key);
        if (colIndex === -1) return;

        const newSchema = [...current.schema];
        newSchema[colIndex] = { ...newSchema[colIndex], ...updates };

        const updated = { ...current, schema: newSchema };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    // ── Metadata update ──
    const updateMetadata = useCallback((updates: Partial<SmartTableMetadata>) => {
        const current = docRef.current;
        if (!current) return;

        const updated = { ...current, metadata: { ...current.metadata, ...updates } };
        setDoc(updated);
        docRef.current = updated;
        updateParent(updated);
    }, [updateParent]);

    return {
        doc,
        metadata: doc?.metadata ?? null,
        schema: doc?.schema ?? [],
        data: doc?.data ?? [],
        error,
        handleCellUpdate,
        addRow,
        deleteRow,
        addColumn,
        deleteColumn,
        handleHeaderUpdate,
        updateColumn,
        updateMetadata,
    };
};
