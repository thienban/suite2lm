import { SmartTableEditable } from '@/components/editor/SmartTableEditable';
import { Button } from '@/components/ui/button';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { Code, Eye } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export const SmartTableNodeView = ({ node, updateAttributes, extension, editor, getPos }: any) => {
    const isSmartTable = node.attrs.language === 'smart-table' || node.attrs.language === 'json';
    // Default to preview mode if it's a smart table
    const [isPreview, setIsPreview] = useState(isSmartTable);

    // Sync state if language changes externally
    useEffect(() => {
        if (node.attrs.language === 'smart-table' || node.attrs.language === 'json') {
            // Keep current state or force preview? 
            // Let's rely on user preference for now, but ensure isSmartTable is true.
        }
    }, [node.attrs.language]);

    const handleUpdate = useCallback((newContent: string) => {
        if (typeof getPos === 'function') {
            const pos = getPos();
            const { tr, schema, doc } = editor.state;

            // Get the live node to ensure we have the correct size even if React prop is stale
            const currentNode = doc.nodeAt(pos);
            if (!currentNode) return;

            // Calculate range of content inside the code block
            // Node start is pos. Content start is pos + 1.
            // Content end is pos + node.nodeSize - 1.
            const from = pos + 1;
            const to = pos + currentNode.nodeSize - 1;

            const transaction = tr.replaceWith(from, to, schema.text(newContent));
            editor.view.dispatch(transaction);
        }
    }, [editor, getPos]);

    return (
        <NodeViewWrapper className="relative group code-block-wrapper" >
            {isSmartTable && (
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" >
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPreview(!isPreview)}
                        className="h-6 px-2 text-xs"
                    >
                        {isPreview ? <><Code className="w-3 h-3 mr-1" /> Source</> : <><Eye className="w-3 h-3 mr-1" /> Preview</>}
                    </Button>
                </div>
            )}

            {
                isPreview && isSmartTable ? (
                    <div className="p-2 border rounded-md bg-white dark:bg-black" contentEditable={false} >
                        <SmartTableEditable content={node.textContent} onUpdate={handleUpdate} />
                    </div>
                ) : (
                    <pre>
                        <NodeViewContent as="div" />
                    </pre>
                )
            }
        </NodeViewWrapper>
    );
};
