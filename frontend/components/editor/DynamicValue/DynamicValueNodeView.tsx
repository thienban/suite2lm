import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

export const DynamicValueNodeView: React.FC<NodeViewProps> = ({ node }) => {
    const query = node.attrs.query as string;
    const question = node.attrs.question as string;
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) return;

        let isMounted = true;
        setLoading(true);

        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/db/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                });

                if (!res.ok) throw new Error('Query failed');
                const data = await res.json();

                if (isMounted) {
                    if (data.data && data.data.length > 0) {
                        const firstRow = data.data[0];
                        // Get first value regardless of key
                        const firstKey = Object.keys(firstRow)[0];
                        const val = firstRow[firstKey];
                        setResult(val !== null && val !== undefined ? String(val) : '(empty)');
                    } else {
                        setResult('(no result)');
                    }
                    setError(null);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Error');
                    console.error(err);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Debounce slightly to avoid flash on quick edits
        const timer = setTimeout(fetchData, 100);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [query]);

    return (
        <NodeViewWrapper as="span" className="inline-flex items-center mx-1 align-baseline relative group cursor-pointer">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" className="px-1.5 py-0 h-6 gap-1.5 font-normal hover:bg-violet-100 transition-colors cursor-default select-none border-violet-200 bg-violet-50 text-violet-900">
                            {loading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : error ? (
                                <span className="text-red-500 font-bold">!</span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-violet-400">📊</span>
                                    <span className="font-semibold text-xs">{result}</span>
                                </span>
                            )}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-3 text-xs">
                        {question && (
                            <div className="mb-2 pb-2 border-b border-white/10">
                                <span className="font-semibold text-violet-200">Question:</span>
                                <div className="mt-1 opacity-90">{question}</div>
                            </div>
                        )}
                        <div>
                            <span className="font-semibold text-violet-200">SQL:</span>
                            <div className="mt-1 font-mono bg-black/20 p-1.5 rounded opacity-80 break-words">
                                {query}
                            </div>
                        </div>
                        {error && (
                            <div className="mt-2 text-red-300">
                                Error: {error}
                            </div>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </NodeViewWrapper>
    );
};
