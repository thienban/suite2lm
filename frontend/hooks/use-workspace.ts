import { FileInfo } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { useFileContent, useFiles, useSaveFile } from './use-api';

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
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');

    // Query Hooks
    const {
        data: files = [],
        refetch: refetchFiles,
        isLoading: filesLoading,
        error: filesError
    } = useFiles();

    const {
        data: fileContent,
        isLoading: contentLoading,
        error: contentError
    } = useFileContent(selectedFile || '');

    const { mutateAsync: saveFileMutation } = useSaveFile();

    // Sync content when file loads
    useEffect(() => {
        if (fileContent !== undefined) {
            setContent(fileContent);
        }
    }, [fileContent]);

    const fetchFiles = useCallback(async () => {
        await refetchFiles();
    }, [refetchFiles]);

    const selectFile = useCallback(async (filename: string) => {
        setSelectedFile(filename);
        // Content will be updated via useEffect when useFileContent resolves
    }, []);

    const saveFile = useCallback(async (newContent: string) => {
        if (!selectedFile) return;
        try {
            await saveFileMutation({ name: selectedFile, content: newContent });
        } catch (err) {
            console.error(err);
            throw new Error("Failed to save");
        }
    }, [selectedFile, saveFileMutation]);

    const loading = filesLoading || (!!selectedFile && contentLoading);
    const error = (filesError as Error)?.message || (contentError as Error)?.message || null;

    return {
        files: files || [],
        selectedFile,
        content,
        loading,
        error: error || null,
        fetchFiles,
        selectFile,
        saveFile
    };
};
