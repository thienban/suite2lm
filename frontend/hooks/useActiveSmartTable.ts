import { useCallback, useEffect, useState } from 'react';

interface ActiveSmartTable {
    content: string;
    pos: number;
}

interface UseActiveSmartTableReturn {
    activeTable: ActiveSmartTable | null;
    selectTable: (content: string, pos: number) => void;
    clearTable: () => void;
}

/**
 * Tracks which Smart Table is currently "selected" via click.
 * SmartTableNodeView dispatches a 'smart-table-select' CustomEvent on click,
 * and this hook listens for it. Clicking outside a table clears the selection.
 */
export const useActiveSmartTable = (): UseActiveSmartTableReturn => {
    const [activeTable, setActiveTable] = useState<ActiveSmartTable | null>(null);

    const selectTable = useCallback((content: string, pos: number) => {
        setActiveTable({ content, pos });
    }, []);

    const clearTable = useCallback(() => {
        setActiveTable(null);
    }, []);

    useEffect(() => {
        const handleSelect = (e: Event) => {
            const detail = (e as CustomEvent).detail as { content: string; pos: number };
            setActiveTable({ content: detail.content, pos: detail.pos });
        };

        const handleDeselect = () => {
            setActiveTable(null);
        };

        window.addEventListener('smart-table-select', handleSelect);
        window.addEventListener('smart-table-deselect', handleDeselect);

        return () => {
            window.removeEventListener('smart-table-select', handleSelect);
            window.removeEventListener('smart-table-deselect', handleDeselect);
        };
    }, []);

    return { activeTable, selectTable, clearTable };
};
