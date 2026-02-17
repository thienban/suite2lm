import { Button } from '@/components/ui/button';
import { useAICommand } from '@/hooks/useAICommand';
import { AICommandRequest } from '@/lib/ai-api';
import { Editor } from '@tiptap/react';
import { Command } from 'cmdk';
import {
    Columns3,
    Database,
    FileText,
    Languages,
    Loader2,
    Sparkles,
    Table,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CommandBarProps {
    editor: Editor;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialCommand?: SlashCommand | null;
    activeTableContent?: string | null;
    activeTablePos?: number | null;
}

export interface SlashCommand {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    mode: AICommandRequest['mode'];
    promptPrefix?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
    {
        id: 'table',
        label: '/tableau',
        description: 'Générer une Smart Table à partir d\'une description',
        icon: <Table className="size-4" />,
        mode: 'table_generate',
    },
    {
        id: 'column',
        label: '/colonne',
        description: 'Ajouter une colonne calculée au tableau actif',
        icon: <Columns3 className="size-4" />,
        mode: 'table_edit',
    },
    {
        id: 'summarize',
        label: '/résumer',
        description: 'Résumer le texte sélectionné ou le document',
        icon: <FileText className="size-4" />,
        mode: 'text_refactor',
        promptPrefix: 'Résume ce texte de manière concise : ',
    },
    {
        id: 'translate',
        label: '/traduire',
        description: 'Traduire le texte sélectionné',
        icon: <Languages className="size-4" />,
        mode: 'text_refactor',
        promptPrefix: 'Traduis ce texte en anglais : ',
    },
    {
        id: 'rephrase',
        label: '/reformuler',
        description: 'Reformuler le texte sélectionné (ton, style)',
        icon: <Sparkles className="size-4" />,
        mode: 'text_refactor',
    },
    {
        id: 'data',
        label: '/data',
        description: 'Interroger vos données en langage naturel',
        icon: <Database className="size-4" />,
        mode: 'text_to_sql',
    },
];

// Preview component that renders JSON table data as a visual HTML table
interface TablePreviewProps {
    json: string;
}

const TablePreview: React.FC<TablePreviewProps> = ({ json }) => {
    const parsed = useMemo(() => {
        try {
            const data = JSON.parse(json);

            if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.schema) && Array.isArray(data.data)) {
                const headers = (data.schema as { label: string; key: string }[]).map(c => c.label);
                const keys = (data.schema as { key: string }[]).map(c => c.key);
                const rows = (data.data as Record<string, unknown>[]).map(row =>
                    keys.map(k => String(row[k] ?? ''))
                );
                return { headers, rows, title: data.metadata?.title as string | undefined };
            }

            return null;
        } catch {
            return null;
        }
    }, [json]);

    if (!parsed) {
        return (
            <div className="px-4 py-3 text-sm text-muted-foreground italic">
                Aperçu non disponible
            </div>
        );
    }

    return (
        <div className="w-full">
            {parsed.title && (
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground">{parsed.title}</div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/30">
                        {parsed.headers.map((h, i) => (
                            <th key={i} className="px-3 py-1.5 text-left font-medium text-xs text-muted-foreground">
                                {String(h)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {parsed.rows.map((row, ri) => (
                        <tr key={ri} className="border-b last:border-0 even:bg-muted/10">
                            {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-1.5 text-xs">
                                    {String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="px-3 py-1 text-[10px] text-muted-foreground">
                {parsed.rows.length} ligne{parsed.rows.length > 1 ? 's' : ''} · {parsed.headers.length} colonne{parsed.headers.length > 1 ? 's' : ''}
            </div>
        </div>
    );
};

export const CommandBar: React.FC<CommandBarProps> = ({ editor, open, onOpenChange, initialCommand, activeTableContent, activeTablePos }) => {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [resultType, setResultType] = useState<string | null>(null);
    const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [selectedTablePos, setSelectedTablePos] = useState<number | null>(null);
    const [autoDetected, setAutoDetected] = useState(false);
    const [availableTables, setAvailableTables] = useState<{ label: string; content: string }[]>([]);
    const [showTablePicker, setShowTablePicker] = useState(false);
    const { execute, loading, error, abort } = useAICommand();
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened, or abort and clean up when closed
    useEffect(() => {
        if (open) {
            setInput('');
            setResult(null);
            setResultType(null);
            setSelectedTable(null);
            setSelectedTablePos(null);
            setAutoDetected(false);
            setAvailableTables([]);
            setShowTablePicker(false);

            // If opened with an initial command, pre-select it
            if (initialCommand) {
                setSelectedCommand(initialCommand);
            } else {
                setSelectedCommand(null);
            }

            // Auto-detect: if cursor is near a Smart Table, auto-populate
            if (activeTableContent && activeTablePos !== null && activeTablePos !== undefined) {
                setSelectedTable(activeTableContent);
                setSelectedTablePos(activeTablePos);
                setAutoDetected(true);
            }

            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            // Abort any pending AI request when closing
            abort();
        }
    }, [open, initialCommand, activeTableContent, activeTablePos, abort]);

    // Find all tables in the document
    const findDocumentTables = useCallback(() => {
        const tables: { label: string; content: string }[] = [];

        editor.state.doc.descendants((node) => {
            if (node.type.name === 'codeBlock') {
                const lang = node.attrs.language;
                if (lang === 'json' || lang === 'smart-table') {
                    try {
                        const data = JSON.parse(node.textContent);

                        // Structured format: { metadata, schema, data }
                        if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.schema)) {
                            const title = data.metadata?.title || 'Tableau';
                            const rowCount = Array.isArray(data.data) ? data.data.length : 0;
                            tables.push({ label: `${title} (${rowCount} lignes)`, content: node.textContent });
                        }
                    } catch {
                        tables.push({ label: 'Tableau JSON', content: node.textContent });
                    }
                }
            }
        });

        return tables;
    }, [editor]);

    // Get current context from the editor
    const getEditorContext = useCallback(() => {
        const { from, to } = editor.state.selection;
        const selection = editor.state.doc.textBetween(from, to, '\n');
        const fullText = editor.state.doc.textContent;

        // Use selectedTable (manually picked or auto-detected)
        const tableContext = selectedTable || '';

        return {
            documentContent: fullText,
            selection,
            cursorPosition: from,
            activeTable: tableContext,
        };
    }, [editor, selectedTable]);

    const handleCommand = useCallback(async (prompt: string, mode: AICommandRequest['mode']) => {
        const context = getEditorContext();

        try {
            const response = await execute({ prompt, context, mode });

            if (response.type === 'error') return;

            setResult(response.content);
            setResultType(response.type);
        } catch {
            // Error is handled by the hook
        }
    }, [execute, getEditorContext]);

    // Submit: either free-form prompt or a selected command with described input
    const handleSubmit = useCallback(() => {
        if (!input.trim() || loading) return;

        // If a slash command was selected, use its mode with the user's description
        if (selectedCommand) {
            const prompt = selectedCommand.promptPrefix
                ? `${selectedCommand.promptPrefix}${input}`
                : input;
            handleCommand(prompt, selectedCommand.mode);
            return;
        }

        // Free-form: auto-detect mode based on context
        const context = getEditorContext();
        let mode: AICommandRequest['mode'] = 'text_generate';
        if (context.activeTable) {
            mode = 'table_edit';
        } else if (context.selection) {
            mode = 'text_refactor';
        }

        handleCommand(input, mode);
    }, [input, loading, selectedCommand, getEditorContext, handleCommand]);

    // Handle slash command selection
    const handleSlashCommand = useCallback((cmd: SlashCommand) => {
        // For commands that work on selection (résumer, traduire), fire immediately
        if (cmd.promptPrefix) {
            const selection = getEditorContext().selection || '';
            handleCommand(`${cmd.promptPrefix}${selection}`, cmd.mode);
            return;
        }

        // For table_edit commands, show table picker first
        if (cmd.mode === 'table_edit') {
            const tables = findDocumentTables();
            if (tables.length === 0) {
                // No tables found — switch to table_generate instead
                setSelectedCommand({ ...cmd, mode: 'table_generate' });
                setInput('');
                setTimeout(() => inputRef.current?.focus(), 50);
                return;
            }
            if (tables.length === 1) {
                // Only one table — select it automatically
                setSelectedTable(tables[0].content);
                setSelectedCommand(cmd);
                setInput('');
                setTimeout(() => inputRef.current?.focus(), 50);
                return;
            }
            // Multiple tables — show picker
            setAvailableTables(tables);
            setShowTablePicker(true);
            setSelectedCommand(cmd);
            return;
        }

        // For other generative commands (tableau, reformuler), enter description mode
        setSelectedCommand(cmd);
        setInput('');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [handleCommand, getEditorContext, findDocumentTables]);

    // Handle table selection from picker
    const handleTableSelect = useCallback((tableContent: string) => {
        setSelectedTable(tableContent);
        setSelectedTablePos(null); // manual pick has no position
        setAutoDetected(false);
        setShowTablePicker(false);
        setInput('');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    // Cancel selected command
    const handleCancelCommand = useCallback(() => {
        if (showTablePicker) {
            setShowTablePicker(false);
            setAvailableTables([]);
            setSelectedCommand(null);
        } else if (selectedTable && !autoDetected) {
            // Only clear manually-selected table, not auto-detected ones
            setSelectedTable(null);
            setSelectedTablePos(null);
        } else if (selectedTable && autoDetected) {
            setSelectedTable(null);
            setSelectedTablePos(null);
            setAutoDetected(false);
        } else {
            setSelectedCommand(null);
        }
        setInput('');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [showTablePicker, selectedTable, autoDetected]);

    // Insert result into the editor
    const handleInsert = useCallback(() => {
        if (!result || !resultType) return;

        switch (resultType) {
            case 'table_update': {
                if (selectedTable) {
                    let replaced = false;

                    // Strategy 1: Use position-based replacement if we have a valid pos
                    if (selectedTablePos !== null) {
                        const node = editor.state.doc.nodeAt(selectedTablePos);
                        if (node && node.type.name === 'codeBlock') {
                            const contentStart = selectedTablePos + 1;
                            const contentEnd = contentStart + node.content.size;
                            const tr = editor.state.tr.replaceWith(
                                contentStart,
                                contentEnd,
                                editor.state.schema.text(result)
                            );
                            editor.view.dispatch(tr);
                            replaced = true;
                        }
                    }

                    // Strategy 2: Fallback to content-match based replacement
                    if (!replaced) {
                        editor.state.doc.descendants((node, pos) => {
                            if (replaced) return false;
                            if (node.type.name === 'codeBlock') {
                                const lang = node.attrs.language;
                                if ((lang === 'json' || lang === 'smart-table') && node.textContent === selectedTable) {
                                    const contentStart = pos + 1;
                                    const contentEnd = contentStart + node.content.size;
                                    const tr = editor.state.tr.replaceWith(
                                        contentStart,
                                        contentEnd,
                                        editor.state.schema.text(result)
                                    );
                                    editor.view.dispatch(tr);
                                    replaced = true;
                                    return false;
                                }
                            }
                        });
                    }
                } else {
                    // No existing table — insert as a new smart-table code block
                    editor.chain().focus().setCodeBlock({ language: 'json' }).run();
                    const { from, to } = editor.state.selection;
                    const tr = editor.state.tr.insertText(result, from, to);
                    editor.view.dispatch(tr);
                }
                break;
            }
            case 'text_insert': {
                editor.chain().focus().insertContent(result).run();
                break;
            }
            case 'text_replace': {
                const { from, to } = editor.state.selection;
                if (from !== to) {
                    editor.chain().focus().insertContentAt({ from, to }, result).run();
                } else {
                    editor.chain().focus().insertContent(result).run();
                }
                break;
            }
        }

        onOpenChange(false);
    }, [result, resultType, editor, onOpenChange, selectedTable, selectedTablePos]);

    // Build placeholder based on state
    const getPlaceholder = () => {
        if (selectedCommand) {
            return selectedCommand.id === 'table'
                ? 'Décrivez le tableau… (ex: suivi de stock boulangerie avec prix et quantités)'
                : selectedCommand.id === 'column'
                    ? 'Décrivez la colonne… (ex: ajoute une colonne TVA à 20%)'
                    : 'Décrivez la transformation souhaitée…';
        }
        return "Demandez à l'IA… (ex: Crée un tableau de produits)";
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Command dialog */}
            <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2">
                    <div className="flex items-center border-b px-3">
                        <Sparkles className="size-4 text-muted-foreground mr-2 shrink-0" />

                        {/* Show active command badge */}
                        {selectedCommand && !showTablePicker && (
                            <button
                                onClick={handleCancelCommand}
                                className="flex items-center gap-1 shrink-0 mr-1 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
                            >
                                {selectedCommand.label}
                                <X className="size-3" />
                            </button>
                        )}

                        {/* Show selected table badge (green = auto-detected, blue = manually picked) */}
                        {selectedTable && (
                            <button
                                onClick={() => { setSelectedTable(null); setSelectedTablePos(null); setAutoDetected(false); setShowTablePicker(true); setAvailableTables(findDocumentTables()); }}
                                className={`flex items-center gap-1 shrink-0 mr-2 px-2 py-0.5 rounded-md text-xs font-medium transition-colors max-w-[180px] ${autoDetected
                                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
                                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                                    }`}
                            >
                                <Table className="size-3 shrink-0" />
                                <span className="truncate">
                                    {autoDetected ? '✦ ' : ''}
                                    {(() => {
                                        try {
                                            const d = JSON.parse(selectedTable);
                                            return d?.metadata?.title || 'Tableau';
                                        } catch { return 'Tableau'; }
                                    })()}
                                </span>
                                <X className="size-3 shrink-0" />
                            </button>
                        )}

                        <Command.Input
                            ref={inputRef}
                            value={input}
                            onValueChange={setInput}
                            placeholder={getPlaceholder()}
                            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (result) {
                                        handleInsert();
                                    } else {
                                        handleSubmit();
                                    }
                                }
                                if (e.key === 'Escape') {
                                    if (selectedCommand) {
                                        handleCancelCommand();
                                    } else {
                                        onOpenChange(false);
                                    }
                                }
                                // Backspace on empty input cancels the selected command
                                if (e.key === 'Backspace' && input === '' && selectedCommand) {
                                    handleCancelCommand();
                                }
                            }}
                        />
                        {loading && <Loader2 className="size-4 text-muted-foreground animate-spin ml-2" />}
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onOpenChange(false)}
                            className="ml-1 shrink-0"
                        >
                            <X className="size-3" />
                        </Button>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b">
                            {error}
                        </div>
                    )}

                    {/* Result preview */}
                    {result && (
                        <div className="border-b">
                            <div className="px-4 py-2 flex items-center justify-between bg-muted/30">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {resultType === 'table_update' ? '📊 Tableau généré' : 'Résultat IA'}
                                </span>
                                <Button size="xs" onClick={handleInsert}>
                                    Insérer ↵
                                </Button>
                            </div>
                            <div className="max-h-64 overflow-auto">
                                {resultType === 'table_update' ? (
                                    <TablePreview json={result} />
                                ) : (
                                    <div className="px-4 py-3 text-sm whitespace-pre-wrap">
                                        {result}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Slash commands (only show when no command selected and no result) */}
                    {!result && !loading && !selectedCommand && (
                        <Command.List className="max-h-[300px] overflow-auto py-2">
                            <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
                                Tapez votre instruction et appuyez sur Entrée
                            </Command.Empty>

                            <Command.Group heading="Commandes">
                                {SLASH_COMMANDS.map((cmd) => (
                                    <Command.Item
                                        key={cmd.id}
                                        value={cmd.label}
                                        onSelect={() => handleSlashCommand(cmd)}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-muted"
                                    >
                                        <span className="flex items-center justify-center size-8 rounded-md bg-muted/50 text-muted-foreground">
                                            {cmd.icon}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{cmd.label}</span>
                                            <span className="text-xs text-muted-foreground">{cmd.description}</span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        </Command.List>
                    )}

                    {/* Table picker */}
                    {!result && !loading && showTablePicker && (
                        <div className="py-2 max-h-[300px] overflow-auto">
                            <div className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">
                                Sélectionnez le tableau à modifier
                            </div>
                            {availableTables.map((table, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleTableSelect(table.content)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md cursor-pointer hover:bg-muted transition-colors text-left"
                                >
                                    <span className="flex items-center justify-center size-8 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                                        <Table className="size-4" />
                                    </span>
                                    <span className="text-sm truncate">{table.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Description prompt for selected command (when not in table picker) */}
                    {!result && !loading && selectedCommand && !showTablePicker && !input && (
                        <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                            Décrivez ce que vous voulez et appuyez sur <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Entrée</kbd>
                        </div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <div className="flex items-center gap-2 px-4 py-6 justify-center text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            L&apos;IA réfléchit…
                        </div>
                    )}
                </Command>

                {/* Footer hint */}
                <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                    <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">↵</kbd> {result ? 'Insérer' : 'Exécuter'}</span>
                    <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd> {selectedCommand ? 'Annuler commande' : 'Fermer'}</span>
                    {selectedCommand && (
                        <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌫</kbd> Retour</span>
                    )}
                </div>
            </div>
        </div>
    );
};
