import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface CustomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
    open,
    onOpenChange,
    children,
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div className="relative z-[99999] w-full max-w-lg p-6 bg-background border rounded-lg shadow-lg">
                {children}
            </div>
        </div>,
        document.body
    );
};

export const CustomDialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => {
    return <div className={className}>{children}</div>;
};

export const CustomDialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
        {children}
    </div>
);

export const CustomDialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-lg font-semibold leading-none tracking-tight">
        {children}
    </h3>
);

export const CustomDialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
        {children}
    </div>
);

export const CustomDialogClose: React.FC<{ asChild?: boolean; children: React.ReactNode; onClick?: () => void }> = ({
    children,
    onClick,
}) => {
    return (
        <div onClick={onClick} className="inline-block">
            {children}
        </div>
    );
};
