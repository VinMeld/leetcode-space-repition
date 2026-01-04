import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Dialog.css';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="dialog-backdrop" onClick={handleBackdropClick}>
            <div
                ref={dialogRef}
                className={`dialog dialog-${size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <div className="dialog-header">
                    <h2 id="dialog-title" className="dialog-title">{title}</h2>
                    <button
                        className="dialog-close"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="dialog-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Dialog;
