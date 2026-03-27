import React, { useState, useRef, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { PanelType } from '../../store/useDashboardStore';

const availableWidgets: { type: PanelType; label: string; description: string }[] = [
  { type: 'TransactionFlow', label: 'Transaction Flow', description: '트랜잭션 흐름도' },
  { type: 'ResponseStats', label: 'Response Stats', description: '응답 시간 통계' },
  { type: 'XViewChart', label: 'X-View', description: '실시간 트랜잭션 분포' },
  { type: 'ActiveServiceChart', label: 'Active Services', description: '활성 서비스 현황' },
  { type: 'JvmMetrics', label: 'JVM Metrics', description: 'CPU, Memory, GC 통계' },
  { type: 'SqlMonitorPanel', label: 'SQL Monitor', description: 'DB SQL 통계 및 에러' },
  { type: 'UnifiedErrorList', label: 'System Errors', description: '실시간 시스템 에러' },
  { type: 'KpiActiveService', label: 'KPI: Active Services', description: '활성 서비스 수치 카드' },
  { type: 'KpiTotalRequest', label: 'KPI: Total Requests', description: '총 요청 수치 카드' },
  { type: 'KpiTotalError', label: 'KPI: Total Errors', description: '에러 수치 카드' },
  { type: 'KpiTps', label: 'KPI: TPS', description: '초당 트랜잭션 수치 카드' },
  { type: 'KpiJvmThread', label: 'KPI: JVM Threads', description: 'JVM 쓰레드 수치 카드' },
];

export const LayoutDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const { 
        panels, addPanel, removePanel,
        isEditMode, toggleEditMode
    } = useDashboardStore();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePanelToggle = (type: PanelType) => {
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
                                    const isAdded = panels.some(p => p.type === widget.type);
                                    return (
                                        <button
                                            key={widget.type}
                                            onClick={() => handlePanelToggle(widget.type)}
                                            className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-indigo-500/10 rounded-md transition-colors text-left"
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
