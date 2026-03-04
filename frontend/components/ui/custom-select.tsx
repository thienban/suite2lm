import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CustomSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string; // For the trigger
    children: React.ReactNode;
}

interface CustomSelectItemProps {
    value: string;
    children: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
}

// Context to share state with Items
const SelectContext = React.createContext<{
    selectedValue: string;
    onSelect: (value: string) => void;
} | null>(null);

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onValueChange,
    placeholder,
    className,
    children,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                // Check if click is inside the portal content (which is not a child of triggerRef)
                // We'll handle this by stopping propagation in the dropdown itself,
                // so if we get here, it's outside.
                // However, the portal is in body. So we need a check.
                // actually, simplest is to use a backdrop in the portal.
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Defer adding listener to avoid immediate close on trigger click
            setTimeout(() => window.addEventListener('click', handleClickOutside), 0);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

    const handleOpen = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
            setIsOpen(true);
        }
    };

    return (
        <SelectContext.Provider value={{ selectedValue: value, onSelect: (v) => { onValueChange(v); setIsOpen(false); } }}>
            <div
                ref={triggerRef}
                className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
                onClick={(e) => {
                    e.stopPropagation(); // Stop bubbling to prevent parent Dialog close if any
                    if (!isOpen) handleOpen(); else setIsOpen(false);
                }}
            >
                <span className={value ? '' : 'text-muted-foreground'}>
                    {/* Find label from children? Hard with ReactNode.
                        For now, just display value or placeholder.
                        Ideally we'd need a map of value->label.
                        Or we let the user pass a display function.
                        Simple hack: The `value` passed here is the internal value.
                        The display should technically be looked up.
                        But usually the parent knows the label.
                        Let's just rely on the parent updating the trigger content if needed,
                        OR simpler: just render the selected value (requires value->label map).
                        Wait, standard Select displays the content of the selected Item.
                        We can traverse children to find the matching label.
                    */}
                    {(() => {
                        let label = placeholder;
                        React.Children.forEach(children, (child) => {
                            if (React.isValidElement(child)) {
                                const item = child as React.ReactElement<any>;
                                if (item.props.value === value) {
                                    label = item.props.children;
                                }
                            }
                        });
                        return label || value;
                    })()}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
            </div>

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100001]" // Higher than Dialog
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                >
                    <div
                        className="absolute z-[100002] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80"
                        style={{
                            top: position.top,
                            left: position.left,
                            width: position.width,
                        }}
                    >
                        <div className="p-1">
                            {children}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </SelectContext.Provider>
    );
};

export const CustomSelectItem: React.FC<CustomSelectItemProps> = ({
    value,
    children,
    className
}: any) => {
    const context = React.useContext(SelectContext);
    if (!context) return null;

    const isSelected = context.selectedValue === value;

    return (
        <div
            className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${isSelected ? 'bg-accent/50 font-medium' : ''} ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                context.onSelect(value);
            }}
        >
            {children}
        </div>
    );
};
