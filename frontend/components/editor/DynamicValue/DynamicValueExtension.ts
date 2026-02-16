import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DynamicValueNodeView } from './DynamicValueNodeView';

export const DynamicValueExtension = Node.create({
    name: 'dynamicValue',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            query: {
                default: null,
            },
            question: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="dynamic-value"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'dynamic-value' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DynamicValueNodeView);
    },

    addInputRules() {
        return [];
    },
});
