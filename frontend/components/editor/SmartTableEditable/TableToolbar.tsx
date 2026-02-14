import { Button } from '@/components/ui/button';
import { Columns3, Plus, Rows3 } from 'lucide-react';
import React from 'react';

interface TableToolbarProps {
    onAddRow: () => void;
    onAddColumn: () => void;
    onDeleteRow?: () => void;
    onDeleteColumn?: () => void;
    canDelete?: boolean;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
    onAddRow,
    onAddColumn,
}) => {
    return (
        <div className="flex items-center gap-1.5 py-1.5 px-1">
            <Button
                variant="ghost"
                size="xs"
                onClick={onAddRow}
                className="text-muted-foreground hover:text-foreground"
            >
                <Plus data-icon="inline-start" className="size-3" />
                <Rows3 className="size-3" />
                Row
            </Button>
            <Button
                variant="ghost"
                size="xs"
                onClick={onAddColumn}
                className="text-muted-foreground hover:text-foreground"
            >
                <Plus data-icon="inline-start" className="size-3" />
                <Columns3 className="size-3" />
                Column
            </Button>
        </div>
    );
};
