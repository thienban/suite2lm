import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAIQuery, useTables } from '@/hooks/use-api';
import { Loader2, Sparkles, Table } from 'lucide-react';
import React, { useState } from 'react';

interface AskDataModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (queryId: string, question: string) => void;
}

export const AskDataModal: React.FC<AskDataModalProps> = ({ open, onOpenChange, onInsert }) => {
    const [question, setQuestion] = useState('');
    const [resultId, setResultId] = useState<string | null>(null);
    const [resultSummary, setResultSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use TanStack Query hooks
    const { data: tables = [] } = useTables();
    const { mutate: generateQuery, isPending: loading } = useAIQuery();

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setError(null);
        setResultId(null);
        setResultSummary(null);

        generateQuery(
            { prompt: question },
            {
                onSuccess: (data: any) => {
                    if (data.type === 'sql_query' && data.query_id) {
                        setResultId(data.query_id);
                        setResultSummary(data.summary || 'Query generated successfully');
                    } else {
                        setError('Unexpected response format');
                    }
                },
                onError: (err: Error) => {
                    setError(err.message || 'Something went wrong');
                }
            }
        );
    };

    const handleInsert = () => {
        if (resultId) {
            onInsert(resultId, question);
            onOpenChange(false);
            setQuestion('');
            setResultId(null);
            setResultSummary(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        Ask Data
                    </DialogTitle>
                    <DialogDescription>
                        Ask a question about your data in natural language. The AI will generate a SQL query.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleGenerate} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="question">Your Question</Label>
                        <Input
                            id="question"
                            placeholder="e.g. Total sales for 2024"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {tables.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Available Tables:</Label>
                            <div className="flex flex-wrap gap-2">
                                {tables.map((t: any) => (
                                    <Badge
                                        key={t.name}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors"
                                        onClick={() => setQuestion(q => {
                                            const prefix = q ? q + ' ' : '';
                                            return prefix + t.name;
                                        })}
                                    >
                                        <Table className="w-3 h-3 mr-1 opacity-70" />
                                        {t.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded border border-red-100">
                            Error: {error}
                        </div>
                    )}

                    {resultId && (
                        <div className="space-y-2">
                            <Label>Generated Query</Label>
                            <div className="p-3 bg-slate-950 text-slate-50 font-mono text-sm rounded border overflow-x-auto">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">ID:</span>
                                    <Badge variant="secondary" className="font-mono text-[10px] h-5">{resultId}</Badge>
                                </div>
                                <div className="text-slate-300 text-xs">{resultSummary}</div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        {resultId ? (
                            <>
                                <Button type="button" variant="outline" onClick={() => { setResultId(null); setResultSummary(null); }}>
                                    Back
                                </Button>
                                <Button type="button" onClick={handleInsert}>
                                    Insert Result
                                </Button>
                            </>
                        ) : (
                            <Button type="submit" disabled={loading || !question.trim()}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    'Generate SQL'
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
