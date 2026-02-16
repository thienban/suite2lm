'use client';

import { DatabaseViewer } from "@/components/database/DatabaseViewer";
import { Editor } from "@/components/editor/editor";
import { Sidebar, ViewMode } from "@/components/layout/Sidebar";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState } from "react";

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

    const [view, setView] = useState<ViewMode>('files');

    const handleSave = async (newContent: string) => {
        try {
            await saveFile(newContent);
        } catch (err) {
            alert("Failed to save");
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar with Navigation */}
            <Sidebar
                view={view}
                onViewChange={setView}
                files={files}
                selectedFile={selectedFile}
                onSelectFile={selectFile}
                onFetchFiles={fetchFiles}
                loading={loading}
                error={error}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                {view === 'files' ? (
                    // Document Editor View
                    selectedFile ? (
                        <Editor initialContent={content} onSave={handleSave} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Select a file to edit
                        </div>
                    )
                ) : (
                    // Database Viewer View
                    <DatabaseViewer />
                )}
            </main>
        </div>
    );
}