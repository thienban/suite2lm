import { AICommandRequest, AICommandResponse, sendAICommand } from '@/lib/ai-api';
import { useCallback, useRef, useState } from 'react';

const AI_TIMEOUT_MS = 30_000; // 30 seconds

interface UseAICommandReturn {
    execute: (req: AICommandRequest) => Promise<AICommandResponse>;
    loading: boolean;
    error: string | null;
    lastResponse: AICommandResponse | null;
    reset: () => void;
    abort: () => void;
}

export const useAICommand = (): UseAICommandReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResponse, setLastResponse] = useState<AICommandResponse | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const abort = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setLoading(false);
    }, []);

    const execute = useCallback(async (req: AICommandRequest): Promise<AICommandResponse> => {
        // Abort any previous in-flight request
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Set a timeout
        const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

        setLoading(true);
        setError(null);

        try {
            const response = await sendAICommand(req, controller.signal);

            if (response.type === 'error') {
                setError(response.message);
                setLastResponse(response);
                return response;
            }

            setLastResponse(response);
            return response;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                const message = 'La requête IA a expiré (timeout 30s). Réessayez avec une instruction plus simple.';
                setError(message);
                throw new Error(message);
            }
            const message = err instanceof Error ? err.message : 'AI command failed';
            setError(message);
            throw err;
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setLastResponse(null);
    }, []);

    return { execute, loading, error, lastResponse, reset, abort };
};
