import React, { useState } from 'react';
import { useErrorMonitor } from '../../hooks/useErrorMonitor';
import type { UnifiedError } from '../../types/error';
import { ServerCrash, Database, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { AppErrorDetailModal } from '../shared/AppErrorDetailModal';
import SqlDetailModal from '../shared/SqlDetailModal';
import BaseChartCard from '../shared/BaseChartCard';

export const UnifiedErrorList: React.FC = () => {
    const { errors, loading } = useErrorMonitor();
    const [selectedError, setSelectedError] = useState<UnifiedError | null>(null);

    const formatTime = (isoString: string) => {
        return DateTime.fromISO(isoString).toFormat('HH:mm:ss.SSS');
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'APP':
                return <ServerCrash className="w-5 h-5 text-rose-500" />;
            case 'SQL':
                return <Database className="w-5 h-5 text-orange-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getBadgeClass = (type: string) => {
        if (type === 'APP') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        if (type === 'SQL') return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    return (
        <BaseChartCard
            title="Recent Errors"
            icon={AlertCircle}
            iconColor="text-rose-500"
            rightLabel={<span className="font-mono">Total: {errors.length}</span>}
            isEmpty={errors.length === 0 && !loading}
            emptyMessage="No recent errors detected"
        >
            <div className="w-full h-full overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {loading && errors.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted text-sm">
                        <div className="animate-spin w-4 h-4 border-2 border-text-accent border-t-transparent rounded-full mr-2" />
                        Loading errors...
                    </div>
                ) : (
                    <div className="space-y-2">
                        {errors.map((error) => (
                            <div
                                key={error.id}
                                onClick={() => setSelectedError(error)}
                                className="group flex flex-col p-3 rounded-md bg-panel hover:bg-panel-header border border-border-main/50 hover:border-border-main transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-panel-header border border-border-main shadow-inner">
                                            {getIconForType(error.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeClass(error.type)}`}>
                                                    {error.type}
                                                </span>
                                                <span className="text-sm font-medium text-main truncate max-w-[300px]" title={error.title}>
                                                    {error.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-xs text-muted mt-1 font-mono">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {formatTime(error.occurredAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="text-xs text-muted font-mono bg-panel-header/50 p-2 rounded border border-border-main/50 truncate">
                                    {error.message}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedError?.type === 'SQL' && (
                <SqlDetailModal
                    isOpen={!!selectedError}
                    onClose={() => setSelectedError(null)}
                    sqlData={selectedError.originalPayload as any}
                />
            )}

            {/* AppError Detail Modal */}
            {selectedError?.type === 'APP' && (
                <AppErrorDetailModal
                    isOpen={!!selectedError}
                    onClose={() => setSelectedError(null)}
                    error={selectedError.originalPayload as any}
                />
            )}
        </BaseChartCard>
    );
};
