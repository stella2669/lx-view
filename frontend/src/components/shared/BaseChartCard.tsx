import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface BaseChartCardProps {
    title: string;
    icon?: LucideIcon;
    iconColor?: string;
    rightLabel?: React.ReactNode;
    children: React.ReactNode;
    isEmpty?: boolean;
    emptyMessage?: string;
}

/**
 * 모니터링 대시보드의 모든 차트/위젯이 사용하는 공통 레이아웃 컨테이너입니다.
 * 배경색, 보더, 패딩, 타이틀, 아이콘, Empty State를 일관되게 단일화합니다.
 */
const BaseChartCard: React.FC<BaseChartCardProps> = ({
    title,
    icon: Icon,
    iconColor = 'text-cyan-400',
    rightLabel,
    children,
    isEmpty = false,
    emptyMessage = 'Awaiting data...'
}) => {
    return (
        <div className="h-full w-full bg-panel rounded-lg shadow-lg border border-border-main p-4 flex flex-col transition-colors min-w-0 min-h-0">
            <div className="flex justify-between items-center mb-2 shrink-0">
                <h2 className="text-sm font-semibold text-main flex items-center gap-2">
                    {Icon && <Icon size={16} className={iconColor} />}
                    {title}
                </h2>
                {rightLabel && (
                    <div className="text-[10px] text-muted font-medium tracking-wide flex items-center gap-2">
                        {rightLabel}
                    </div>
                )}
            </div>
            <div className="flex-1 relative overflow-hidden min-w-0 min-h-0">
                {isEmpty ? (
                    <div className="flex items-center justify-center h-full w-full text-xs text-muted animate-pulse">
                        {emptyMessage}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default BaseChartCard;
