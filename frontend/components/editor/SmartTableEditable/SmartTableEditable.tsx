'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
    AllCommunityModule,
    ColDef,
    ModuleRegistry,
    themeQuartz,
    type CellValueChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AlertCircle } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TableToolbar } from './TableToolbar';
import { useSmartTable } from './useSmartTable';

// Register AG Grid community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom theme to match the existing design
const smartTableTheme = themeQuartz.withParams({
    borderRadius: 6,
    headerBackgroundColor: 'var(--muted)',
    headerTextColor: 'var(--muted-foreground)',
    headerFontWeight: 500,
    headerFontSize: 13,
    fontSize: 14,
    rowBorder: { color: 'var(--border)', width: 1 },
    columnBorder: false,
    wrapperBorder: false,
    spacing: 4,
});

interface SmartTableEditableProps {
    content: string;
    onUpdate: (newContent: string) => void;
}

export const SmartTableEditable: React.FC<SmartTableEditableProps> = ({ content, onUpdate }) => {
    const {
        localData,
        mode,
        error,
        handleCellUpdate,
        addRow,
        deleteRow,
        addColumn,
        deleteColumn,
        handleHeaderUpdate
    } = useSmartTable({ content, onUpdate });

    const gridRef = useRef<AgGridReact>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        type: 'row' | 'column';
        index: number;
    } | null>(null);

    // Calculate headers
    const headers = useMemo(() => {
        if (!localData || localData.length === 0) return [];
        if (mode === 'arrays') {
            return localData[0] as string[];
        } else {
            return Object.keys(localData[0]);
        }
    }, [localData, mode]);

    // Build column definitions from headers
    const columnDefs = useMemo<ColDef[]>(() => {
        if (!headers || headers.length === 0) return [];

        return headers.map((header: string, index: number) => ({
            headerName: String(header),
            field: mode === 'objects' ? String(header) : String(index),
            editable: true,
            flex: 1,
            minWidth: 100,
            valueGetter: mode === 'arrays'
                ? (params: any) => params.data?.[index] ?? ''
                : undefined,
            valueSetter: mode === 'arrays'
                ? (params: any) => {
                    params.data[index] = params.newValue;
                    return true;
                }
                : undefined,
        }));
    }, [headers, mode]);

    // Convert data for AG Grid: for arrays mode, skip the header row
    const rowData = useMemo(() => {
        if (!localData || localData.length === 0) return [];
        if (mode === 'arrays') {
            return localData.slice(1);
        }
        return localData;
    }, [localData, mode]);

    // Handle cell value changes from AG Grid
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
        const rowIndex = mode === 'arrays' ? event.rowIndex! + 1 : event.rowIndex!;
        const columnId = event.colDef.field!;
        handleCellUpdate(rowIndex, columnId, event.newValue);
    }, [mode, handleCellUpdate]);

    // Derived state for column count
    const colCount = useMemo(() => {
        if (mode === 'arrays' && localData.length > 0) {
            return (localData[0] as string[]).length;
        }
        if (mode === 'objects' && localData.length > 0) {
            return Object.keys(localData[0]).length;
        }
        return 0;
    }, [localData, mode]);

    // Default column definition
    const defaultColDef = useMemo<ColDef>(() => ({
        editable: true,
        resizable: true,
        sortable: true,
        filter: false,
        suppressMovable: true,
    }), []);

    if (error) {
        return (
            <div className="relative w-full rounded-lg border border-destructive/50 p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-destructive text-destructive dark:border-destructive">
                <AlertCircle className="h-4 w-4" />
                <h5 className="mb-1 font-medium leading-none tracking-tight">JSON Error</h5>
                <div className="text-sm [&_p]:leading-relaxed">{error}</div>
            </div>
        );
    }

    if (!localData || localData.length === 0) {
        return <div className="text-gray-500 italic p-2 border rounded">Empty Table</div>;
    }

    return (
        <ContextMenu
            onOpenChange={(open) => {
                if (!open) setContextMenu(null);
            }}
        >
            <ContextMenuTrigger asChild>
                <div className="rounded-md border my-4 overflow-hidden w-full">
                    <div style={{ width: '100%' }}>
                        <AgGridReact
                            ref={gridRef}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            theme={smartTableTheme}
                            domLayout="autoHeight"
                            onCellValueChanged={onCellValueChanged}
                            singleClickEdit={true}
                            stopEditingWhenCellsLoseFocus={true}
                            onCellContextMenu={(event) => {
                                if (event.rowIndex !== null && event.rowIndex !== undefined) {
                                    setContextMenu({
                                        type: 'row',
                                        index: mode === 'arrays' ? event.rowIndex + 1 : event.rowIndex,
                                    });
                                }
                            }}
                            suppressContextMenu={true}
                        />
                    </div>
                    <div className="border-t">
                        <TableToolbar
                            onAddRow={() => addRow(localData.length - 1, 'after')}
                            onAddColumn={() => addColumn(colCount - 1, 'after')}
                        />
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {contextMenu?.type === 'row' && (
                    <>
                        <ContextMenuItem onClick={() => addRow(contextMenu.index, 'before')}>Add Row Above</ContextMenuItem>
                        <ContextMenuItem onClick={() => addRow(contextMenu.index, 'after')}>Add Row Below</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => deleteRow(contextMenu.index)} className="text-destructive">Delete Row</ContextMenuItem>
                    </>
                )}
                {!contextMenu && (
                    <>
                        <ContextMenuItem onClick={() => addRow(localData.length - 1, 'after')}>Add Row</ContextMenuItem>
                        <ContextMenuItem onClick={() => addColumn(colCount - 1, 'after')}>Add Column</ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};
