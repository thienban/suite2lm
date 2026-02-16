import { Button } from '@/components/ui/button';
import {
    CustomDialog,
    CustomDialogClose,
    CustomDialogContent,
    CustomDialogFooter,
    CustomDialogHeader,
    CustomDialogTitle
} from '@/components/ui/custom-dialog';
import {
    CustomSelect,
    CustomSelectItem
} from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ColumnType } from '@/types/smart-table.types';
import React, { useState } from 'react';

interface ColumnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, type: ColumnType) => void;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'currency', label: 'Devise' },
    { value: 'percentage', label: 'Pourcentage' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Sélection' },
    { value: 'formula', label: 'Formule' },
];

export const ColumnDialog: React.FC<ColumnDialogProps> = ({
    open,
    onOpenChange,
    onSave,
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('text');

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name, type);
        setName('');
        setType('text');
        onOpenChange(false);
    };

    return (
        <CustomDialog open={open} onOpenChange={onOpenChange}>
            <CustomDialogContent className="sm:max-w-[425px]">
                <CustomDialogHeader>
                    <CustomDialogTitle>Ajouter une colonne</CustomDialogTitle>
                </CustomDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nom
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <CustomSelect
                            value={type}
                            onValueChange={(v) => setType(v as ColumnType)}
                            placeholder="Sélectionner un type"
                            className="col-span-3"
                        >
                            {COLUMN_TYPES.map((t) => (
                                <CustomSelectItem key={t.value} value={t.value}>
                                    {t.label}
                                </CustomSelectItem>
                            ))}
                        </CustomSelect>
                    </div>
                </div>
                <CustomDialogFooter>
                    <CustomDialogClose onClick={() => onOpenChange(false)}>
                        <Button variant="outline">
                            Annuler
                        </Button>
                    </CustomDialogClose>
                    <Button onClick={handleSave} disabled={!name.trim()}>
                        Ajouter
                    </Button>
                </CustomDialogFooter>
            </CustomDialogContent>
        </CustomDialog>
    );
};
