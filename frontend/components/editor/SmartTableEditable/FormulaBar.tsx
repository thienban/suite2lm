import { cn } from '@/lib/utils';
import type { SmartTableColumn } from '@/types/smart-table.types';
import { Plus, Sigma } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface FormulaBarProps {
    column: SmartTableColumn | null;
    schema: SmartTableColumn[];
    onUpdate: (expression: string) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ column, schema, onUpdate }) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

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

    const insertToken = (token: string) => {
        if (!inputRef.current) return;

        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;

        const newValue = value.substring(0, start) + token + value.substring(end);
        setValue(newValue);
        onUpdate(newValue);

        // Restore focus and move cursor
        setTimeout(() => {
            inputRef.current?.focus();
            const newPos = start + token.length;
            inputRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    };

    if (!column || column.type !== 'formula') {
        return null;
    }

    // Filter columns suitable for calculation (numbers, etc)
    // Exclude the current column itself to avoid self-reference (though circular check handles it too)
    const availableColumns = schema.filter(c =>
        (c.type === 'number' || c.type === 'currency' || c.type === 'percentage') &&
        c.key !== column.key
    );

    return (
        <div className="flex flex-col border-b bg-muted/30">
            {/* Input Line */}
            <div className="flex items-center gap-2 px-2 py-1 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground select-none" title="Formule">
                    <Sigma className="size-4" />
                    <span className="font-mono text-xs font-medium">{column.label} =</span>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder="[colonne_a] * [colonne_b]"
                    className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
                    spellCheck={false}
                />
            </div>

            {/* Helper Chips */}
            {availableColumns.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2 pb-1.5 pt-0.5">
                    {availableColumns.map(col => (
                        <button
                            key={col.key}
                            onClick={() => insertToken(`[${col.key}]`)}
                            className={cn(
                                "flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[10px] border shadow-sm hover:bg-muted transition-colors",
                                "text-muted-foreground hover:text-foreground font-mono"
                            )}
                            type="button"
                            title={`Insérer [${col.key}]`}
                        >
                            <Plus className="size-2.5 opacity-50" />
                            {col.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
