'use client';

import { CommandBar, SlashCommand } from '@/components/ai/CommandBar';
import { SlashMenu } from '@/components/ai/SlashMenu';
import { SlashMenuExtension } from '@/components/ai/SlashMenuExtension';
import { Button } from '@/components/ui/button';
import { useActiveSmartTable } from '@/hooks/useActiveSmartTable';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Italic,
    List,
    Save,
    Sparkles
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Markdown } from 'tiptap-markdown';
import { AskDataModal } from './DataQuery/AskDataModal';
import { DynamicValueExtension } from './DynamicValue/DynamicValueExtension';
import { SmartTableExtension } from './SmartTable';

export interface EditorProps {
    initialContent?: string;
    onSave?: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ initialContent = '', onSave }) => {
    const [commandBarOpen, setCommandBarOpen] = useState(false);
    const [askDataOpen, setAskDataOpen] = useState(false);
    const [slashCommand, setSlashCommand] = useState<SlashCommand | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            SmartTableExtension,
            DynamicValueExtension,
            SlashMenuExtension,
            Markdown.configure({
                html: true,
                transformPastedText: true,
                transformCopiedText: true,
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none w-full max-w-none',
            },
        },
        immediatelyRender: false
    });

    const { activeTable: detectedTable } = useActiveSmartTable();

    // Deselect Smart Table when clicking in the editor content area (outside tables)
    const handleEditorAreaClick = useCallback((e: React.MouseEvent) => {
        // Check if the click target is inside a Smart Table node view
        const target = e.target as HTMLElement;
        const isInsideTable = target.closest('.code-block-wrapper');
        if (!isInsideTable) {
            window.dispatchEvent(new CustomEvent('smart-table-deselect'));
        }
    }, []);

    // Update content when initialContent changes
    useEffect(() => {
        if (editor && initialContent) {
            editor.commands.setContent(initialContent);
        }
    }, [initialContent, editor]);

    // Global keyboard shortcut: Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSlashCommand(null); // Reset the initial command
                setCommandBarOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleOpenCommandBar = useCallback(() => {
        setSlashCommand(null);
        setCommandBarOpen(true);
    }, []);

    // Slash menu selects a command → open CommandBar with that command pre-loaded
    const handleSlashCommand = useCallback((cmd: SlashCommand) => {
        if (cmd.id === 'data') {
            setAskDataOpen(true);
            return;
        }
        setSlashCommand(cmd);
        setCommandBarOpen(true);
    }, []);

    const handleInsertData = useCallback((query: string, question: string) => {
        editor?.chain().focus().insertContent({
            type: 'dynamicValue',
            attrs: { query, question }
        }).run();
    }, [editor]);

    if (!editor) {
        return null;
    }

    const handleSave = () => {
        // Get Markdown
        const markdown = (editor.storage as any).markdown.getMarkdown();
        onSave?.(markdown);
    };

    return (
        <div className="flex flex-col border rounded-lg h-[80vh] m-4 shadow-sm bg-background">
            <div className="flex items-center gap-1 p-2 border-b bg-muted/20 justify-between">
                <div className="flex items-center gap-1">
                    <Button
                        variant={editor.isActive('bold') ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('italic') ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        <Italic className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant={editor.isActive('heading', { level: 1 }) ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                        <Heading1 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('heading', { level: 2 }) ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                        <Heading2 className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant={editor.isActive('bulletList') ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('codeBlock') ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    >
                        <Code className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenCommandBar}
                        title="AI Command (Ctrl+K)"
                        className="text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950"
                    >
                        <Sparkles className="w-4 h-4" />
                    </Button>
                </div>

                <Button
                    size="sm"
                    onClick={handleSave}
                    className="ml-auto"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 relative" onClick={handleEditorAreaClick}>
                <EditorContent editor={editor} />

                {/* Inline Slash Menu */}
                <SlashMenu
                    editor={editor as any}
                    onSelectCommand={handleSlashCommand}
                />
            </div>

            {/* AI Command Bar */}
            <CommandBar
                editor={editor}
                open={commandBarOpen}
                onOpenChange={setCommandBarOpen}
                initialCommand={slashCommand}
                activeTableContent={detectedTable?.content ?? null}
                activeTablePos={detectedTable?.pos ?? null}
            />

            <AskDataModal
                open={askDataOpen}
                onOpenChange={setAskDataOpen}
                onInsert={handleInsertData}
            />
        </div>
    );
};

