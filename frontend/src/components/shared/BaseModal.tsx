import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    defaultWidth?: number;
    defaultHeight?: number;
}

const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    defaultWidth = 896,
    defaultHeight = 600
}) => {
    const [modalSize, setModalSize] = useState({ width: defaultWidth, height: defaultHeight });

    React.useEffect(() => {
        if (isOpen) {
            setModalSize({ width: defaultWidth, height: defaultHeight });
        }
    }, [isOpen, defaultWidth, defaultHeight]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const startModalResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = modalSize.width;
        const startHeight = modalSize.height;

        const doDrag = (dragEvent: MouseEvent) => {
            setModalSize({
                width: Math.max(400, startWidth + dragEvent.clientX - startX),
                height: Math.max(300, startHeight + dragEvent.clientY - startY)
            });
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-panel border border-border-main rounded-xl shadow-2xl relative flex flex-col transition-colors"
                style={{ width: modalSize.width, height: modalSize.height, maxWidth: '95vw', maxHeight: '95vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-main bg-panel-header/50">
                    <h2 className="text-lg font-semibold text-main flex items-center gap-2">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-panel-header rounded-lg text-muted hover:text-main transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {children}
                </div>

                {/* Modal Resize Handle */}
                <div
                    className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize z-50"
                    onMouseDown={startModalResize}
                >
                    <svg viewBox="0 0 10 10" fill="none" className="w-full h-full text-gray-500 opacity-50 hover:opacity-100 transition-opacity">
                        <path d="M8 0L10 2V10H2L0 8H8V0Z" fill="currentColor" />
                    </svg>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-corner {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4B5563;
                }
            `}} />
        </div>,
        document.body
    );
};

export default BaseModal;
