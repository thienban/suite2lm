import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTables } from "@/hooks/use-api";
import { Database, RefreshCw, Table } from "lucide-react";
import React from "react";

interface TableListProps {
    onSelectTable: (tableName: string) => void;
    selectedTable: string | null;
}

export const TableList: React.FC<TableListProps> = ({ onSelectTable, selectedTable }) => {
    const { data: tables = [], isLoading: loading, error, refetch } = useTables();
    // Helper to get array from current structure if needed, but hook returns {name: string}[]
    // The API seems to return { data: [{name: 't1'}, ...] }
    // My hook extracts `data.data` which is `[{name: 't1'}, ...]`

    // However, the original code used `row.name` map.
    // My hook returns `{name: string}[]`.
    // So `tables` is `[{name: 'foo'}, {name: 'bar'}]`.
    // The mapping below needs to access `.name`.

    return (
        <div className="flex flex-col h-full bg-muted/10">
            <div className="p-4 border-b flex justify-between items-center bg-background/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-500" />
                    Tables
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => refetch()} disabled={loading}>
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {loading && tables.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
                    )}
                    {error && (
                        <div className="text-xs text-destructive p-2 border border-destructive rounded mb-2">
                            {(error as Error).message}
                        </div>
                    )}
                    {tables.map((table) => (
                        <Button
                            key={table.name}
                            variant={selectedTable === table.name ? "secondary" : "ghost"}
                            className="w-full justify-start text-sm h-9 font-normal"
                            onClick={() => onSelectTable(table.name)}
                        >
                            <Table className="w-4 h-4 mr-2 opacity-70" />
                            {table.name}
                        </Button>
                    ))}
                    {tables.length === 0 && !loading && !error && (
                        <div className="text-xs text-muted-foreground p-2 text-center">No tables found.</div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
