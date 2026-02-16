'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import { useFormulaEngine } from '@/hooks/useFormulaEngine';
import type { SmartTableColumn } from '@/types/smart-table.types';
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
import { ColumnDialog } from './ColumnDialog';
import { FormulaBar } from './FormulaBar';
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

// ─── Build AG Grid ColDef from schema column ────────────────
const buildColDef = (col: SmartTableColumn): ColDef => {
    const base: ColDef = {
        headerName: col.label,
        field: col.key,
        editable: col.type !== 'formula',
        flex: 1,
        minWidth: 100,
    };

    switch (col.type) {
        case 'number':
            return {
                ...base,
                cellDataType: 'number',
                valueParser: (params) => {
                    const val = Number(params.newValue);
                    return isNaN(val) ? params.oldValue : val;
                },
            };

        case 'currency':
            return {
                ...base,
                cellDataType: 'number',
                valueFormatter: (params) => {
                    if (params.value == null || params.value === '') return '';
                    const unit = col.unit || '€';
                    return `${Number(params.value).toFixed(2)} ${unit}`;
                },
                valueParser: (params) => {
                    const cleaned = String(params.newValue).replace(/[^\d.,\-]/g, '').replace(',', '.');
                    const val = Number(cleaned);
                    return isNaN(val) ? params.oldValue : val;
                },
            };

        case 'percentage':
            return {
                ...base,
                cellDataType: 'number',
                valueFormatter: (params) => {
                    if (params.value == null || params.value === '') return '';
                    return `${(Number(params.value) * 100).toFixed(0)}%`;
                },
                valueParser: (params) => {
                    let val = Number(String(params.newValue).replace('%', ''));
                    if (isNaN(val)) return params.oldValue;
                    // If user typed 20 (meaning 20%), convert to 0.20
                    if (val > 1) val = val / 100;
                    return val;
                },
            };

        case 'select':
            return {
                ...base,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: col.options || [],
                },
            };

        case 'date':
            return {
                ...base,
                // Simple text-based date for now
            };

        case 'formula':
            return {
                ...base,
                editable: false,
                cellStyle: (params: { value: unknown }) => ({
                    color: params.value === '#ERR' ? 'var(--destructive)' : 'var(--muted-foreground)',
                    fontStyle: 'italic',
                }),
                headerTooltip: col.expression ? `= ${col.expression}` : undefined,
            };

        case 'text':
        default:
            return base;
    }
};

export const SmartTableEditable: React.FC<SmartTableEditableProps> = ({ content, onUpdate }) => {
    const {
        schema,
        data,
        metadata,
        error,
        handleCellUpdate,
        addRow,
        deleteRow,
        addColumn,
        deleteColumn,
        updateColumn,
    } = useSmartTable({ content, onUpdate });

    // Compute formula values
    const computedData = useFormulaEngine({ schema, data });

    const gridRef = useRef<AgGridReact>(null);
    const [focusedColKey, setFocusedColKey] = useState<string | null>(null);
    const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);

    // Get currently focused column schema
    const focusedColumn = useMemo(() =>
        schema.find(col => col.key === focusedColKey) || null,
        [schema, focusedColKey]);

    const handleCellFocused = useCallback((params: any) => {
        setFocusedColKey(params.column ? params.column.getColId() : null);
    }, []);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        type: 'row' | 'column';
        index: number;
    } | null>(null);

    // Build column definitions from schema
    const columnDefs = useMemo<ColDef[]>(() => {
        if (!schema || schema.length === 0) return [];
        return schema.map(buildColDef);
    }, [schema]);

    // Handle cell value changes from AG Grid
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
        const columnKey = event.colDef.field!;
        handleCellUpdate(event.rowIndex!, columnKey, event.newValue);
    }, [handleCellUpdate]);

    // Default column definition
    const defaultColDef = useMemo<ColDef>(() => ({
        editable: true,
        resizable: true,
        sortable: true,
        filter: false,
        suppressMovable: true,
    }), []);

    const renderContent = () => {
        if (error) {
            return (
                <div className="relative w-full rounded-lg border border-destructive/50 p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-destructive text-destructive dark:border-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <h5 className="mb-1 font-medium leading-none tracking-tight">JSON Error</h5>
                    <div className="text-sm [&_p]:leading-relaxed">{error}</div>
                </div>
            );
        }

        if (!data || data.length === 0) {
            return (
                <div className="rounded-md border my-4 overflow-hidden w-full">
                    {metadata?.title && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b truncate">
                            {metadata.title}
                        </div>
                    )}
                    <div className="p-8 text-center text-muted-foreground italic">
                        Table vide. Ajoutez une colonne ou une ligne pour commencer.
                    </div>
                    <div className="border-t">
                        <TableToolbar
                            onAddRow={() => addRow(0, 'after')}
                            onAddColumnClick={() => setIsAddColumnDialogOpen(true)}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="rounded-md border my-4 overflow-hidden w-full">
                {/* Metadata title */}
                {metadata?.title && (
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b truncate">
                        {metadata.title}
                        {metadata.last_ai_action && (
                            <span className="ml-2 text-violet-500">✦ {metadata.last_ai_action}</span>
                        )}
                    </div>
                )}

                {/* Formula Bar */}
                <div className="bg-background">
                    <FormulaBar
                        column={focusedColumn}
                        schema={schema}
                        onExpressionChange={(expr) => focusedColKey && updateColumn(focusedColKey, { expression: expr })}
                        onRename={() => {
                            const newName = prompt('Nouveau nom :', focusedColumn?.label);
                            if (newName && focusedColumn) {
                                const idx = schema.findIndex(c => c.key === focusedColumn.key);
                                if (idx !== -1) updateColumn(focusedColumn.key, { label: newName, key: newName.toLowerCase().replace(/[^a-z0-9]/g, '_') });
                            }
                        }}
                        onTypeChange={(type) => focusedColKey && updateColumn(focusedColKey, { type })}
                        onDelete={() => {
                            if (focusedColumn && confirm('Supprimer cette colonne ?')) {
                                const idx = schema.findIndex(c => c.key === focusedColumn.key);
                                if (idx !== -1) deleteColumn(idx);
                            }
                        }}
                    />
                </div>

                <ContextMenu
                    onOpenChange={(open) => {
                        if (!open) setContextMenu(null);
                    }}
                >
                    <ContextMenuTrigger asChild>
                        <div style={{ width: '100%' }}>
                            <AgGridReact
                                ref={gridRef}
                                rowData={computedData}
                                columnDefs={columnDefs}
                                defaultColDef={defaultColDef}
                                theme={smartTableTheme}
                                domLayout="autoHeight"
                                onCellValueChanged={onCellValueChanged}
                                onCellFocused={handleCellFocused}
                                singleClickEdit={true}
                                stopEditingWhenCellsLoseFocus={true}
                                onCellContextMenu={(event) => {
                                    if (event.rowIndex !== null && event.rowIndex !== undefined) {
                                        setContextMenu({
                                            type: 'row',
                                            index: event.rowIndex,
                                        });
                                    }
                                }}
                                suppressContextMenu={true}
                            />
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
                                <ContextMenuItem onClick={() => addRow(data.length - 1, 'after')}>Add Row</ContextMenuItem>
                                <ContextMenuItem onClick={() => setIsAddColumnDialogOpen(true)}>Add Column</ContextMenuItem>
                            </>
                        )}
                    </ContextMenuContent>
                </ContextMenu>

                <div className="border-t">
                    <TableToolbar
                        onAddRow={() => addRow(data.length - 1, 'after')}
                        onAddColumnClick={() => setIsAddColumnDialogOpen(true)}
                    />
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}

            <ColumnDialog
                open={isAddColumnDialogOpen}
                onOpenChange={setIsAddColumnDialogOpen}
                onSave={(name, type) => {
                    addColumn(schema.length - 1, 'after', name, type);
                    setIsAddColumnDialogOpen(false);
                }}
            />
        </>
    );
};
