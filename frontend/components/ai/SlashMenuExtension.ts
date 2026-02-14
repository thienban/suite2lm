import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/react';

export const slashMenuPluginKey = new PluginKey('slashMenu');

export const SlashMenuExtension = Extension.create({
    name: 'slashMenu',

    addStorage() {
        return {
            active: false,
            range: null as { from: number; to: number } | null,
            query: '',
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: slashMenuPluginKey,

                appendTransaction(transactions, oldState, newState) {
                    // Only process if there was a doc change
                    const docChanged = transactions.some(tr => tr.docChanged);
                    if (!docChanged && extension.storage.active) {
                        // Check if cursor moved away
                        const { from } = newState.selection;
                        const range = extension.storage.range;
                        if (range) {
                            const $from = newState.doc.resolve(from);
                            const blockStart = from - $from.parentOffset;
                            if (blockStart !== range.from || from < range.from) {
                                extension.storage.active = false;
                                extension.storage.range = null;
                                extension.storage.query = '';
                            }
                        }
                        return null;
                    }
                    if (!docChanged) return null;

                    const { from } = newState.selection;
                    const $from = newState.doc.resolve(from);
                    const parentText = $from.parent.textContent;
                    const blockStart = from - $from.parentOffset;

                    // If already active, update range and query
                    if (extension.storage.active) {
                        const range = extension.storage.range;
                        if (range && blockStart === range.from) {
                            // Check if the text still starts with /
                            if (parentText.startsWith('/')) {
                                extension.storage.range = { from: blockStart, to: blockStart + parentText.length };
                                extension.storage.query = parentText.slice(1);
                            } else {
                                // Text no longer starts with /, deactivate
                                extension.storage.active = false;
                                extension.storage.range = null;
                                extension.storage.query = '';
                            }
                        } else {
                            // Moved to a different block, deactivate
                            extension.storage.active = false;
                            extension.storage.range = null;
                            extension.storage.query = '';
                        }
                        return null;
                    }

                    // Check if we should activate: text is "/" at start of block
                    // Parent must be a paragraph-like block (not code, heading, etc.)
                    if (
                        $from.parent.type.name === 'paragraph' &&
                        parentText.startsWith('/') &&
                        parentText.length <= 20 // Don't activate on long text that happens to start with /
                    ) {
                        // Check that the previous state had empty or shorter text at this block
                        const oldFrom = oldState.selection.from;
                        const old$From = oldState.doc.resolve(Math.min(oldFrom, oldState.doc.content.size));
                        const oldParentText = old$From.parent.textContent;

                        // Activate only if the / was just typed (old text didn't start with /)
                        if (!oldParentText.startsWith('/') || oldParentText.length === 0) {
                            extension.storage.active = true;
                            extension.storage.range = { from: blockStart, to: blockStart + parentText.length };
                            extension.storage.query = parentText.slice(1);
                        }
                    }

                    return null;
                },

                props: {
                    handleKeyDown(view, event) {
                        if (!extension.storage.active) return false;

                        // Arrow keys, Enter, Escape are handled by the React component
                        if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
                            return false;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});
