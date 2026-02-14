'use client';

import { Button } from '@/components/ui/button';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Italic,
    List,
    Save
} from 'lucide-react';
import { useEffect } from 'react';
import { Markdown } from 'tiptap-markdown';
import { SmartTableExtension } from './SmartTable';

export interface EditorProps {
    initialContent?: string;
    onSave?: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ initialContent = '', onSave }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            SmartTableExtension,
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

    // Update content when initialContent changes
    useEffect(() => {
        if (editor && initialContent) {
            editor.commands.setContent(initialContent);
        }
    }, [initialContent, editor]);

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
            <div className="flex-1 overflow-auto p-4">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
