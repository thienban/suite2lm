import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useTableData, useTableSchema } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import React from "react";

interface DataGridProps {
    tableName: string;
}

export const DataGrid: React.FC<DataGridProps> = ({ tableName }) => {
    const { data: columns = [], isLoading: loadingSchema, error: schemaError } = useTableSchema(tableName);
    const { data: data = [], isLoading: loadingData, error: dataError } = useTableData(tableName);

    const loading = loadingSchema || loadingData;
    const error = (schemaError as Error)?.message || (dataError as Error)?.message;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Error loading {tableName}: {error}
            </div>
        );
    }

    if (!columns.length) {
        return <div className="p-8 text-center text-muted-foreground">Table seems empty or invalid.</div>;
    }

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-4 border-b bg-muted/5">
                <h2 className="font-bold text-lg">{tableName}</h2>
                <span className="text-xs text-muted-foreground">{data.length} rows (limit 100)</span>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col) => (
                            <TableHead key={col.name} className="whitespace-nowrap">
                                {col.name}
                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                    ({col.type})
                                </span>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, i) => (
                        <TableRow key={i}>
                            {columns.map((col) => (
                                <TableCell key={col.name} className="whitespace-nowrap font-mono text-xs">
                                    {row[col.name] !== null ? String(row[col.name]) : <span className="opacity-30">NULL</span>}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center h-24 text-muted-foreground">
                                No data found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
