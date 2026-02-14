'use client';

import { Editor } from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { FileText, RefreshCw } from "lucide-react";

export default function Page() {
    const {
        files,
        selectedFile,
        content,
        loading,
        error,
        fetchFiles,
        selectFile,
        saveFile
    } = useWorkspace();

    const handleSave = async (newContent: string) => {
        try {
            await saveFile(newContent);
            alert("Saved!");
        } catch (err) {
            alert("Failed to save");
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="font-semibold">Files</h2>
                    <Button size="icon" variant="ghost" onClick={fetchFiles} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                    {error && (
                        <div className="text-xs text-destructive p-2 border border-destructive rounded mb-2">
                            {error}
                        </div>
                    )}
                    {files.map((file) => (
                        <Button
                            key={file.name}
                            variant={selectedFile === file.name ? "secondary" : "ghost"}
                            className="w-full justify-start text-sm"
                            onClick={() => selectFile(file.name)}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            {file.name}
                        </Button>
                    ))}
                    {files.length === 0 && !loading && !error && (
                        <div className="text-sm text-muted-foreground p-2">No files found.</div>
                    )}
                </div>
                <div className="p-4 border-t">
                    {/* Create file is manual in MVP or via backend? Spec Step 1 didn't say. */}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full">
                {selectedFile ? (
                    <Editor initialContent={content} onSave={handleSave} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a file to edit
                    </div>
                )}
            </main>
        </div>
    );
}