import type { SmartTableColumn } from '@/types/smart-table.types';
import { Sigma } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FormulaBarProps {
    column: SmartTableColumn | null;
    onUpdate: (expression: string) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ column, onUpdate }) => {
    const [value, setValue] = useState('');

    // Sync state with column expression
    useEffect(() => {
        if (column?.type === 'formula') {
            setValue(column.expression || '');
        } else {
            setValue('');
        }
    }, [column]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        onUpdate(e.target.value);
    };

    if (!column || column.type !== 'formula') {
        return null;
    }

    return (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-2 py-1 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground select-none" title="Formule">
                <Sigma className="size-4" />
                <span className="font-mono text-xs font-medium">{column.label} =</span>
            </div>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder="[colonne_a] * [colonne_b]"
                className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
                spellCheck={false}
            />
        </div>
    );
};
