import { AICommandRequest, AICommandResponse, sendAICommand } from '@/lib/ai-api';
import { useCallback, useState } from 'react';

interface UseAICommandReturn {
    execute: (req: AICommandRequest) => Promise<AICommandResponse>;
    loading: boolean;
    error: string | null;
    lastResponse: AICommandResponse | null;
    reset: () => void;
}

export const useAICommand = (): UseAICommandReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResponse, setLastResponse] = useState<AICommandResponse | null>(null);

    const execute = useCallback(async (req: AICommandRequest): Promise<AICommandResponse> => {
        setLoading(true);
        setError(null);

        try {
            const response = await sendAICommand(req);

            if (response.type === 'error') {
                setError(response.message);
                setLastResponse(response);
                return response;
            }

            setLastResponse(response);
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'AI command failed';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setLastResponse(null);
    }, []);

    return { execute, loading, error, lastResponse, reset };
};
