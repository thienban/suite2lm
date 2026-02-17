import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ColumnType, SmartTableColumn } from '@/types/smart-table.types';
import {
    AlignLeft,
    Calendar,
    Euro,
    Hash,
    List,
    Percent,
    Settings,
    Sigma,
    Trash
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface FormulaBarProps {
    column: SmartTableColumn | null;
    schema: SmartTableColumn[];
    onExpressionChange: (expression: string) => void;
    onRename: () => void;
    onTypeChange: (type: ColumnType) => void;
    onDelete: () => void;
}

const getIconForType = (type: ColumnType) => {
    switch (type) {
        case 'text': return <AlignLeft className="size-3.5" />;
        case 'number': return <Hash className="size-3.5" />;
        case 'currency': return <Euro className="size-3.5" />;
        case 'percentage': return <Percent className="size-3.5" />;
        case 'date': return <Calendar className="size-3.5" />;
        case 'select': return <List className="size-3.5" />;
        case 'formula': return <Sigma className="size-3.5 text-blue-500" />;
        default: return <AlignLeft className="size-3.5" />;
    }
};

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'currency', label: 'Devise' },
    { value: 'percentage', label: 'Pourcentage' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Sélection' },
    { value: 'formula', label: 'Formule' },
];

export const FormulaBar: React.FC<FormulaBarProps> = ({
    column,
    schema,
    onExpressionChange,
    onRename,
    onTypeChange,
    onDelete
}) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local state with column expression
    useEffect(() => {
        if (column?.type === 'formula') {
            setValue(column.expression || '');
        } else {
            setValue('');
        }
    }, [column]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onExpressionChange(newValue);
    };

    const insertToken = (token: string) => {
        if (!inputRef.current) return;

        const input = inputRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;

        const newValue = value.slice(0, start) + token + value.slice(end);
        setValue(newValue);
        onExpressionChange(newValue);

        // Restore focus and move cursor
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + token.length, start + token.length);
        }, 0);
    };

    if (!column) return null;

    const isFormula = column.type === 'formula';

    return (
        <div className="flex flex-col border-b bg-muted/30">
            {/* Main Bar */}
            <div className="flex items-center gap-2 px-2 py-1 text-sm h-10">
                {/* Settings Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6 p-0 hover:bg-muted">
                            <Settings className="size-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={onRename}>
                            Renommer la colonne
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Changer le type</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {COLUMN_TYPES.map((t) => (
                                    <DropdownMenuItem
                                        key={t.value}
                                        onClick={() => onTypeChange(t.value)}
                                        className={cn(column.type === t.value && "bg-accent")}
                                    >
                                        <span className="mr-2 flex items-center gap-2">
                                            {getIconForType(t.value)}
                                            {t.label}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                            <Trash className="mr-2 size-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-border mx-1" />

                {/* Column Badge */}
                <div
                    className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded select-none border"
                    title={`Type: ${column.type}`}
                >
                    {getIconForType(column.type)}
                    <span className="font-mono text-xs font-medium max-w-[100px] truncate">
                        {column.label}
                    </span>
                    <span className="text-xs">=</span>
                </div>

                {/* Expression Input */}
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className={cn(
                            "w-full bg-transparent border-none outline-none text-sm font-mono h-full py-1",
                            !isFormula && "text-muted-foreground opacity-50 cursor-not-allowed"
                        )}
                        placeholder={isFormula ? "Ex: [prix] * [quantite]" : "Modifiez le type en Formule pour éditer"}
                        value={isFormula ? value : (column.type === 'text' ? '(Valeurs textuelles)' : '(Valeurs calculées/statiques)')}
                        onChange={handleChange}
                        disabled={!isFormula}
                    />
                </div>
            </div>

            {/* Assistance Chips (Only for formula) */}
            {isFormula && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-t overflow-x-auto">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Insérer :</span>
                    {schema.filter(c => c.key !== column.key).map(col => (
                        <button
                            key={col.key}
                            onClick={() => insertToken(`[${col.key}]`)}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted hover:bg-muted/80 border rounded-full transition-colors whitespace-nowrap"
                            title={`Clé: ${col.key}`}
                        >
                            {getIconForType(col.type)}
                            <span>{col.label}</span>
                        </button>
                    ))}
                    {schema.length <= 1 && (
                        <span className="text-xs text-muted-foreground italic">Aucune autre colonne disponible</span>
                    )}
                </div>
            )}
        </div>
    );
};
