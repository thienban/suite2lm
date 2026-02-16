import React, { useState } from "react";
import { DataGrid } from "./DataGrid";
import { TableList } from "./TableList";

export const DatabaseViewer: React.FC = () => {
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Table List Sidebar */}
            <div className="w-48 border-r h-full overflow-hidden">
                <TableList
                    selectedTable={selectedTable}
                    onSelectTable={setSelectedTable}
                />
            </div>

            {/* Data Grid Area */}
            <div className="flex-1 overflow-hidden h-full flex flex-col">
                {selectedTable ? (
                    <DataGrid tableName={selectedTable} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a table to view data
                    </div>
                )}
            </div>
        </div>
    );
};
