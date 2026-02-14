import { SLASH_COMMANDS, SlashCommand } from '@/components/ai/CommandBar';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SlashMenuProps {
    editor: {
        view: {
            coordsAtPos: (pos: number) => { top: number; left: number; bottom: number };
            dom: HTMLElement;
        };
        storage: {
            slashMenu?: {
                active: boolean;
                range: { from: number; to: number } | null;
                query: string;
            };
        };
        on: (event: string, callback: () => void) => void;
        off: (event: string, callback: () => void) => void;
        commands: {
            deleteRange: (range: { from: number; to: number }) => boolean;
            focus: () => { run: () => void };
        };
        chain: () => { focus: () => { deleteRange: (range: { from: number; to: number }) => { run: () => void } } };
    };
    onSelectCommand: (cmd: SlashCommand) => void;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ editor, onSelectCommand }) => {
    const [active, setActive] = useState(false);
    const [query, setQuery] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Filter commands based on query
    const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase())
    );

    // Listen to editor storage changes
    useEffect(() => {
        const handleUpdate = () => {
            const storage = editor.storage.slashMenu;
            if (!storage) return;

            if (storage.active && storage.range) {
                setActive(true);
                setQuery(storage.query || '');
                setSelectedIndex(0);

                // Position the menu near the slash character
                try {
                    const coords = editor.view.coordsAtPos(storage.range.from);
                    const editorRect = editor.view.dom.getBoundingClientRect();
                    setPosition({
                        top: coords.bottom - editorRect.top + 4,
                        left: coords.left - editorRect.left,
                    });
                } catch {
                    // Fallback if position calculation fails
                }
            } else {
                setActive(false);
            }
        };

        editor.on('transaction', handleUpdate);
        return () => editor.off('transaction', handleUpdate);
    }, [editor]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!active) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    handleSelect(filteredCommands[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Close the menu — clear the slash text
                const storage = editor.storage.slashMenu;
                if (storage?.range) {
                    editor.chain().focus().deleteRange(storage.range).run();
                }
                if (storage) storage.active = false;
                setActive(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [active, filteredCommands, selectedIndex, editor]);

    const handleSelect = useCallback((cmd: SlashCommand) => {
        // Delete the slash text from the editor
        const storage = editor.storage.slashMenu;
        if (storage?.range) {
            editor.chain().focus().deleteRange(storage.range).run();
            storage.active = false;
        }
        setActive(false);

        // Open CommandBar with this command pre-loaded
        onSelectCommand(cmd);
    }, [editor, onSelectCommand]);

    if (!active || filteredCommands.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="absolute z-50 min-w-[260px] max-w-[320px] rounded-lg border bg-popover shadow-lg py-1.5 animate-in fade-in-0 slide-in-from-top-2"
            style={{ top: position.top, left: position.left }}
        >
            <div className="px-2.5 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Commandes
            </div>
            {filteredCommands.map((cmd, index) => (
                <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 text-sm cursor-pointer transition-colors ${index === selectedIndex
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100'
                        : 'text-foreground hover:bg-muted/60'
                        }`}
                >
                    <span className={`flex items-center justify-center size-7 rounded-md ${index === selectedIndex
                        ? 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400'
                        : 'bg-muted/50 text-muted-foreground'
                        }`}>
                        {cmd.icon}
                    </span>
                    <div className="flex flex-col items-start">
                        <span className="font-medium text-[13px]">{cmd.label}</span>
                        <span className="text-[11px] text-muted-foreground">{cmd.description}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};
