import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { AlertCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { DebouncedInput } from './DebouncedInput';
import { useSmartTable } from './useSmartTable';

interface SmartTableEditableProps {
    content: string;
    onUpdate: (newContent: string) => void;
}

export const SmartTableEditable: React.FC<SmartTableEditableProps> = ({ content, onUpdate }) => {
    const {
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
    } = useSmartTable({ content, onUpdate });

    // Calculate headers
    const headers = useMemo(() => {
        if (!localData || localData.length === 0) return [];
        if (mode === 'arrays') {
            return localData[0]; // First row is the header row
        } else {
            return Object.keys(localData[0]);
        }
    }, [localData, mode]);

    // Stabilize headers dependency using stringification
    const headersKey = useMemo(() => JSON.stringify(headers), [headers]);

    // Derived state for column count
    const colCount = useMemo(() => {
        if (mode === 'arrays' && localData.length > 0) {
            return localData[0].length;
        }
        if (mode === 'objects' && localData.length > 0) {
            return Object.keys(localData[0]).length;
        }
        return 0;
    }, [localData, mode]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        // Mode Arrays: first row is headers
        if (mode === 'arrays') {
            if (colCount === 0) return [];
            return Array.from({ length: colCount }).map((_, index) => ({
                accessorFn: (row: any[]) => row[index],
                id: index.toString(),
                header: () => (
                    <DebouncedInput
                        value={headers[index] ?? ""}
                        onChange={val => handleHeaderUpdate(index, val as string)}
                        className="w-full bg-transparent border-none focus:outline-none p-0 h-auto font-bold shadow-none placeholder:text-muted-foreground/50"
                        placeholder={`Col ${index + 1}`}
                    />
                ),
                cell: (info: any) => (
                    <DebouncedInput
                        value={info.getValue() as string}
                        onChange={val => handleCellUpdate(info.row.index + 1, index.toString(), val)}
                        className="w-full bg-transparent border-none focus:outline-none p-0 h-auto shadow-none"
                    />
                )
            }));
        }

        // Mode Objects
        else {
            if (!headersKey) return [];
            const headerList = JSON.parse(headersKey);
            return headerList.map((key: string) => ({
                accessorKey: key,
                header: key,
                cell: (info: any) => (
                    <DebouncedInput
                        value={info.getValue() as string}
                        onChange={val => handleCellUpdate(info.row.index, key, val)}
                        className="w-full bg-transparent border-none focus:outline-none p-0 h-auto shadow-none"
                    />
                )
            }));
        }
    }, [colCount, mode, headersKey, handleCellUpdate, handleHeaderUpdate]);

    const tableData = useMemo(() => {
        if (mode === 'arrays' && localData.length > 0) {
            return localData.slice(1); // Skip header row
        }
        return localData;
    }, [localData, mode]);

    const table = useReactTable({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

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
        <ContextMenu>
            <ContextMenuTrigger disabled={false}>
                <div className="rounded-md border my-4 overflow-hidden w-full">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        {headerGroup.headers.map(header => (
                                            <ContextMenu key={header.id}>
                                                <ContextMenuTrigger asChild>
                                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 bg-muted/50 cursor-context-menu">
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </th>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem onClick={() => addColumn(parseInt(header.id), 'before')}>Add Col Left</ContextMenuItem>
                                                    <ContextMenuItem onClick={() => addColumn(parseInt(header.id), 'after')}>Add Col Right</ContextMenuItem>
                                                    <ContextMenuSeparator />
                                                    <ContextMenuItem onClick={() => deleteColumn(parseInt(header.id))} className="text-destructive">Delete Column</ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {table.getRowModel().rows.map(row => (
                                    <ContextMenu key={row.id}>
                                        <ContextMenuTrigger asChild>
                                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-context-menu">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={() => addRow(row.index + 1, 'before')}>Add Row Above</ContextMenuItem>
                                            <ContextMenuItem onClick={() => addRow(row.index + 1, 'after')}>Add Row Below</ContextMenuItem>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem onClick={() => deleteRow(row.index + 1)} className="text-destructive">Delete Row</ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Global Actions (Right click row/col for specifics)</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
