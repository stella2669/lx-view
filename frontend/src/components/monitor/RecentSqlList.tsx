import React from 'react';
import { Database, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import type { LogAppSlowQuery } from '../../types/sql';
import { DateTime } from 'luxon';
import BaseChartCard from '../shared/BaseChartCard';

interface RecentSqlListProps {
    recentSlow: LogAppSlowQuery[];
    loading?: boolean;
    onRowClick: (query: LogAppSlowQuery) => void;
    onRefresh: () => void;
}

const RecentSqlList: React.FC<RecentSqlListProps> = ({ recentSlow, loading, onRowClick, onRefresh }) => {

    const formatDate = (isoString: string) => {
        return DateTime.fromISO(isoString).toFormat('HH:mm:ss.SSS');
    };

    return (
        <BaseChartCard
            title="Recent Slow Queries"
            icon={Database}
            iconColor="text-pink-400"
            rightLabel={
                <>
                    <span className="text-xs font-mono bg-panel-header px-2 py-1 rounded">
                        TOP 50
                    </span>
                    <button
                        onClick={onRefresh}
                        className="text-muted hover:text-text-accent transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-text-accent' : ''} />
                    </button>
                </>
            }
        >
            <div className="w-full h-full overflow-auto rounded-b-lg custom-scrollbar">
                <table className="text-left text-sm text-main table-fixed w-full min-w-[500px]">
                    <thead className="text-xs uppercase bg-panel-header/80 backdrop-blur-md text-muted sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-medium w-32 whitespace-nowrap">Time</th>
                            <th className="px-4 py-3 font-medium w-[40%] whitespace-nowrap">Query Preview</th>
                            <th className="px-4 py-3 font-medium text-right w-28 whitespace-nowrap">Duration</th>
                            <th className="px-4 py-3 font-medium text-center w-20 whitespace-nowrap">Status</th>
                            <th className="px-4 py-3 font-medium text-center w-24 whitespace-nowrap">Thread</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentSlow.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <div className="flex flex-col items-center justify-center py-16 text-muted">
                                        <Clock size={32} className="mb-2 opacity-50" />
                                        <p>No slow queries recorded recently.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            recentSlow.map((query) => {
                                const isSlow = query.executionTimeMs >= 1000;
                                const isError = query.executionTimeMs === -1; // Assuming we set it or use status

                                return (
                                    <tr
                                        key={query.id}
                                        onClick={() => onRowClick(query)}
                                        className="border-b border-border-main/50 hover:bg-panel-header/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted">
                                            {formatDate(query.occurredAt)}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-main truncate overflow-hidden text-ellipsis whitespace-nowrap">
                                            {query.sqlQuery.replace(/\s+/g, ' ')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-mono text-xs px-2 py-0.5 rounded ${isSlow ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-text-accent'}`}>
                                                {query.executionTimeMs.toLocaleString()} ms
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center flex items-center justify-center">
                                            {isError || isSlow ? (
                                                <AlertTriangle size={14} className="text-rose-400" />
                                            ) : (
                                                <ShieldCheck size={14} className="text-emerald-400" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-muted truncate" title={query.threadName || 'Thread'}>
                                            {query.threadName?.split('-').pop() || 'N/A'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </BaseChartCard>
    );
};

export default RecentSqlList;
