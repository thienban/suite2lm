import { AICommandRequest, sendAICommand } from '@/lib/ai-api';
import { getFileContent, getFiles, saveFileContent } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Files Hooks
export const useFiles = () => {
    return useQuery({
        queryKey: ['files'],
        queryFn: getFiles,
    });
};

export const useFileContent = (filename: string) => {
    return useQuery({
        queryKey: ['files', filename],
        queryFn: () => getFileContent(filename),
        enabled: !!filename,
    });
};

export const useSaveFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, content }: { name: string; content: string }) => saveFileContent(name, content),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files'] });
            queryClient.invalidateQueries({ queryKey: ['files', variables.name] });
        },
    });
};

// AI Hooks
export const useAICommand = () => {
    return useMutation({
        mutationFn: (req: AICommandRequest) => sendAICommand(req),
    });
};

// DB Hooks
export const useTables = () => {
    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const res = await fetch('http://localhost:8080/api/db/tables');
            if (!res.ok) throw new Error('Failed to fetch tables');
            const data = await res.json();
            return data.data as { name: string }[];
        }
    });
};

export const useTableSchema = (tableName: string) => {
    return useQuery({
        queryKey: ['tables', tableName, 'schema'],
        queryFn: async () => {
            const res = await fetch(`http://localhost:8080/api/db/tables/${tableName}/schema`);
            if (!res.ok) throw new Error('Failed to fetch schema');
            const data = await res.json();
            return data.data as { name: string; type: string }[];
        },
        enabled: !!tableName,
    });
};

export const useTableData = (tableName: string) => {
    return useQuery({
        queryKey: ['tables', tableName, 'data'],
        queryFn: async () => {
            const res = await fetch(`http://localhost:8080/api/db/tables/${tableName}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            return data.data as any[];
        },
        enabled: !!tableName,
    });
};

export const useAIQuery = () => {
    return useMutation({
        mutationFn: async (req: { prompt: string; context?: any }) => {
            const res = await fetch('http://localhost:8080/api/ai/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'text_to_sql',
                    prompt: req.prompt,
                    context: req.context || { active_table: '' }
                }),
            });

            if (!res.ok) throw new Error('Failed to generate SQL');

            const data = await res.json();
            if (data.type === 'error') {
                throw new Error(data.message || 'AI Error');
            }
            return data;
        }
    });
}
