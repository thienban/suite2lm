import { Database, FileText, Files, RefreshCw } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ViewMode = 'files' | 'database';

interface SidebarProps {
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    // Files props
    files: { name: string }[];
    selectedFile: string | null;
    onSelectFile: (name: string) => void;
    onFetchFiles: () => void;
    loading?: boolean;
    error?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
    view,
    onViewChange,
    files,
    selectedFile,
    onSelectFile,
    onFetchFiles,
    loading,
    error
}) => {
    return (
        <aside className="w-64 border-r bg-muted/10 flex flex-col h-full">
            {/* Main Navigation */}
            <div className="p-2 border-b flex gap-1">
                <Button
                    variant={view === 'files' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 justify-start"
                    onClick={() => onViewChange('files')}
                >
                    <Files className="w-4 h-4 mr-2" />
                    Files
                </Button>
                <Button
                    variant={view === 'database' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 justify-start"
                    onClick={() => onViewChange('database')}
                >
                    <Database className="w-4 h-4 mr-2" />
                    Database
                </Button>
            </div>

            {/* Content based on view */}
            {view === 'files' && (
                <>
                    <div className="p-4 border-b flex justify-between items-center bg-background/50">
                        <h2 className="font-semibold text-sm">Documents</h2>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onFetchFiles} disabled={loading}>
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                        <div className="space-y-1">
                            {error && (
                                <div className="text-xs text-destructive p-2 border border-destructive rounded mb-2">
                                    {error}
                                </div>
                            )}
                            {files.map((file) => (
                                <Button
                                    key={file.name}
                                    variant={selectedFile === file.name ? "secondary" : "ghost"}
                                    className="w-full justify-start text-sm h-9 font-normal"
                                    onClick={() => onSelectFile(file.name)}
                                >
                                    <FileText className="w-4 h-4 mr-2 opacity-70" />
                                    {file.name}
                                </Button>
                            ))}
                            {files.length === 0 && !loading && !error && (
                                <div className="text-xs text-muted-foreground p-2 text-center">No files found.</div>
                            )}
                        </div>
                    </ScrollArea>
                </>
            )}

            {view === 'database' && (
                <div className="p-4 text-sm text-muted-foreground text-center mt-10">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Select a table to view data</p>
                </div>
            )}
        </aside>
    );
};
