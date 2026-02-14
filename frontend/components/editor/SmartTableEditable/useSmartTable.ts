import { useCallback, useEffect, useRef, useState } from 'react';

// Helper to determine if JSON is array of arrays or array of objects
const parseData = (content: string) => {
    try {
        const json = JSON.parse(content);
        let data = json;
        let wrapper = null;

        // Support Wrapper format { id: "...", data: [...] }
        if (!Array.isArray(json) && typeof json === 'object' && json !== null && Array.isArray(json.data)) {
            data = json.data;
            wrapper = { ...json }; // Clone to preserve other keys
        }

        if (!Array.isArray(data)) return { error: "Root or .data must be an array" };
        if (data.length === 0) return { data: [], wrapper };

        // Mode 1: Array of Arrays [ ["Name", "Age"], ["Alice", 30] ]
        if (Array.isArray(data[0])) {
            return { mode: 'arrays', data, wrapper };
        }

        // Mode 2: Array of Objects [ { "Name": "Alice", "Age": 30 } ]
        if (typeof data[0] === 'object') {
            return { mode: 'objects', data, wrapper };
        }

        return { error: "Unknown array format", wrapper };
    } catch (e) {
        return { error: (e as Error).message };
    }
};

interface UseSmartTableProps {
    content: string;
    onUpdate: (newContent: string) => void;
}

export const useSmartTable = ({ content, onUpdate }: UseSmartTableProps) => {
    const [localData, setLocalData] = useState<any[]>([]);
    const [wrapper, setWrapper] = useState<any>(null);
    const [mode, setMode] = useState<'arrays' | 'objects'>('arrays');
    const [error, setError] = useState<string | null>(null);

    // Ref to access current data in handlers without forcing re-creation
    const dataRef = useRef<any[]>(localData);
    const wrapperRef = useRef<any>(wrapper);

    // Initialize state from content
    useEffect(() => {
        const result = parseData(content);
        if (result.error) {
            setError(result.error);
        } else {
            setError(null);

            // Optimization: Avoid resetting localData if it effectively matches the new content
            const currentString = JSON.stringify(result.data);
            const localString = JSON.stringify(localData);

            if (currentString !== localString) {
                setLocalData(result.data!);
                setMode(result.mode as any);
                setWrapper(result.wrapper);
                dataRef.current = result.data!;
                wrapperRef.current = result.wrapper;
            }
        }
    }, [content, localData]);

    // Update ref when localData changes
    useEffect(() => {
        dataRef.current = localData;
    }, [localData]);
    useEffect(() => {
        wrapperRef.current = wrapper;
    }, [wrapper]);

    const updateParent = useCallback((newData: any[]) => {
        let jsonToSave = newData;
        if (wrapperRef.current) {
            jsonToSave = { ...wrapperRef.current, data: newData };
        }
        const jsonString = JSON.stringify(jsonToSave, null, 2);
        onUpdate(jsonString);
    }, [onUpdate]);

    const handleCellUpdate = useCallback((rowIndex: number, columnId: string, value: any) => {
        const currentData = dataRef.current;
        const newData = [...currentData];

        if (mode === 'arrays') {
            const colIndex = parseInt(columnId);
            const newRow = [...newData[rowIndex]];
            newRow[colIndex] = value;
            newData[rowIndex] = newRow;
        } else {
            newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };
        }

        setLocalData(newData);
        dataRef.current = newData;
        updateParent(newData);
    }, [mode, updateParent]);

    const addRow = useCallback((index: number, where: 'before' | 'after') => {
        const currentData = dataRef.current;
        const newData = [...currentData];
        const insertIndex = where === 'before' ? index : index + 1;

        let newRow: any;
        if (mode === 'arrays') {
            const colCount = currentData.length > 0 ? currentData[0].length : 0;
            newRow = new Array(colCount).fill("");
        } else {
            const keys = Object.keys(currentData[0]);
            newRow = {};
            keys.forEach(k => newRow[k] = "");
        }

        newData.splice(insertIndex, 0, newRow);
        setLocalData(newData);
        updateParent(newData);
    }, [mode, updateParent]);

    const deleteRow = useCallback((index: number) => {
        const currentData = dataRef.current;
        const newData = [...currentData];
        newData.splice(index, 1);
        setLocalData(newData);
        updateParent(newData);
    }, [updateParent]);

    const addColumn = useCallback((colIndex: number, where: 'before' | 'after') => {
        if (mode !== 'arrays') {
            alert("Column addition only supported for Array of Arrays mode currently.");
            return;
        }
        const currentData = dataRef.current;
        const newData = currentData.map(row => {
            const newRow = [...row];
            const insertIndex = where === 'before' ? colIndex : colIndex + 1;
            newRow.splice(insertIndex, 0, "");
            return newRow;
        });
        setLocalData(newData);
        updateParent(newData);
    }, [mode, updateParent]);

    const deleteColumn = useCallback((colIndex: number) => {
        if (mode !== 'arrays') {
            alert("Column deletion only supported for Array of Arrays mode currently.");
            return;
        }
        const currentData = dataRef.current;
        const newData = currentData.map(row => {
            const newRow = [...row];
            newRow.splice(colIndex, 1);
            return newRow;
        });
        setLocalData(newData);
        updateParent(newData);
    }, [mode, updateParent]);

    const handleHeaderUpdate = useCallback((index: number, value: string) => {
        const currentData = dataRef.current;
        if (mode === 'arrays' && currentData.length > 0) {
            const newData = [...currentData];
            const newHeaderRow = [...newData[0]];
            newHeaderRow[index] = value;
            newData[0] = newHeaderRow;

            setLocalData(newData);
            dataRef.current = newData;
            updateParent(newData);
        }
    }, [mode, updateParent]);

    return {
        localData,
        mode,
        error,
        dataRef,
        handleCellUpdate,
        addRow,
        deleteRow,
        addColumn,
        deleteColumn,
        handleHeaderUpdate
    };
};
