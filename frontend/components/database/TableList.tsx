import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, RefreshCw, Table } from "lucide-react";
import React, { useEffect, useState } from "react";

interface TableListProps {
    onSelectTable: (tableName: string) => void;
    selectedTable: string | null;
}

export const TableList: React.FC<TableListProps> = ({ onSelectTable, selectedTable }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTables = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:8080/api/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'" }),
            });
            const data = await res.json();
            if (data.data) {
                setTables(data.data.map((row: any) => row.name));
            } else {
                setTables([]);
            }
        } catch (err: any) {
            setError("Failed to load tables");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    return (
        <div className="flex flex-col h-full bg-muted/10">
            <div className="p-4 border-b flex justify-between items-center bg-background/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-500" />
                    Tables
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={fetchTables} disabled={loading}>
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
                            {error}
                        </div>
                    )}
                    {tables.map((table) => (
                        <Button
                            key={table}
                            variant={selectedTable === table ? "secondary" : "ghost"}
                            className="w-full justify-start text-sm h-9 font-normal"
                            onClick={() => onSelectTable(table)}
                        >
                            <Table className="w-4 h-4 mr-2 opacity-70" />
                            {table}
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
