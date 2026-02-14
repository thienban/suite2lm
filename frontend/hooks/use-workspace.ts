import { FileInfo, getFileContent, getFiles, saveFileContent } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

interface UseWorkspaceReturn {
    files: FileInfo[];
    selectedFile: string | null;
    content: string;
    loading: boolean;
    error: string | null;
    fetchFiles: () => Promise<void>;
    selectFile: (filename: string) => Promise<void>;
    saveFile: (newContent: string) => Promise<void>;
}

export const useWorkspace = (): UseWorkspaceReturn => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getFiles();
            setFiles(data);
            setError(null);
        } catch (err) {
            setError("Failed to load files. Is backend running on port 8080?");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const selectFile = useCallback(async (filename: string) => {
        try {
            setLoading(true);
            const text = await getFileContent(filename);
            setContent(text);
            setSelectedFile(filename);
            setError(null);
        } catch (err) {
            setError(`Failed to load ${filename}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveFile = useCallback(async (newContent: string) => {
        if (!selectedFile) return;
        try {
            await saveFileContent(selectedFile, newContent);
        } catch (err) {
            // We might want to expose this error
            throw new Error("Failed to save");
        }
    }, [selectedFile]);

    return {
        files,
        selectedFile,
        content,
        loading,
        error,
        fetchFiles,
        selectFile,
        saveFile
    };
};
