import { Input } from '@/components/ui/input';
import React, { useEffect, useState } from 'react';

interface DebouncedInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
    value: string | number;
    onChange: (value: string | number) => void;
    debounce?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (value !== initialValue) {
                onChange(value);
            }
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, debounce, initialValue, onChange]);

    const handleBlur = () => {
        if (value !== initialValue) {
            onChange(value);
        }
    };

    return (
        <Input
            {...props}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
        />
    );
};
