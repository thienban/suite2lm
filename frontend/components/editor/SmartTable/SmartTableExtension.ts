import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { common, createLowlight } from 'lowlight';
import { SmartTableNodeView } from './SmartTableNodeView';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

export const SmartTableExtension = CodeBlockLowlight.extend({
    addNodeView() {
        return ReactNodeViewRenderer(SmartTableNodeView);
    },
}).configure({
    lowlight,
});
