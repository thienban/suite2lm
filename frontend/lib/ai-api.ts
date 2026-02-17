const API_URL = 'http://localhost:8080/api';

export interface AICommandRequest {
    prompt: string;
    context: {
        documentContent?: string;
        selection?: string;
        cursorPosition?: number;
        activeTable?: string;
    };
    mode: 'table_generate' | 'table_edit' | 'text_generate' | 'text_refactor' | 'text_to_sql';
}

export interface AICommandResponse {
    type: 'table_update' | 'text_insert' | 'text_replace' | 'sql_query' | 'error';
    content: string;
    message: string;
}

export const sendAICommand = async (req: AICommandRequest, signal?: AbortSignal): Promise<AICommandResponse> => {
    const res = await fetch(`${API_URL}/ai/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `AI request failed (${res.status})`);
    }

    return res.json();
};
