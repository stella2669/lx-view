import React, { useState, useRef, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { PanelType } from '../../store/useDashboardStore';

export const LayoutDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const { 
        panels, addPanel, removePanel,
        isEditMode, toggleEditMode,
        availableWidgets, fetchAvailableWidgets
    } = useDashboardStore();

    useEffect(() => {
        if (isEditMode) {
            fetchAvailableWidgets();
        }
    }, [isEditMode, fetchAvailableWidgets]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePanelToggle = (type: string) => {
        const existingPanel = panels.find((p) => p.type === type);
        if (existingPanel) {
            removePanel(existingPanel.id);
        } else {
            addPanel(type);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {isEditMode && (
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 font-medium text-sm rounded-lg transition-colors border shadow-md ${
                            isOpen
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                                : 'bg-panel border-border-main hover:border-indigo-500/50 text-main'
                        }`}
                    >
                        + Add Widget
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-[280px] bg-panel border gap-2 border-border-main rounded-lg shadow-2xl z-50 flex flex-col p-2">
                            <div className="px-2 py-1 text-xs font-semibold text-main uppercase tracking-wider border-b border-border-main mb-2 pb-2">
                            </div>
                            
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                                {availableWidgets.map(widget => {
                                    const isAdded = panels.some(p => p.type === widget.widgetType);
                                    return (
                                        <button
                                            key={widget.widgetType}
                                            onClick={() => handlePanelToggle(widget.widgetType)}
                                            className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-indigo-500/10 rounded-md transition-colors text-left font-semibold"
                                            title={widget.description}
                                        >
                                            <span className="truncate pr-2">{widget.label}</span>
                                            {isAdded && <Check size={14} className="text-indigo-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={() => {
                    toggleEditMode();
                    if (isEditMode) setIsOpen(false); // 편집 모드 종료 시 드롭다운 닫기
                }}
                className={`flex items-center gap-2 px-4 py-1.5 font-bold text-sm rounded-lg transition-all border shadow-lg ${
                    isEditMode
                        ? 'bg-cyan-500 text-white border-cyan-400 hover:bg-cyan-600 hover:shadow-cyan-500/20'
                        : 'bg-panel border-border-main hover:border-cyan-500/50 text-main'
                }`}
            >
                <Settings size={16} className={isEditMode ? 'animate-spin-slow' : ''} />
                {isEditMode ? 'Finish Editing' : 'Edit Layout'}
            </button>
        </div>
    );
};
