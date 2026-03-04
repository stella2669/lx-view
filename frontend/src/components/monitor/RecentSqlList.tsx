import React from 'react';
import { Database, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import type { LogAppSlowQuery } from '../../types/sql';
import { DateTime } from 'luxon';

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
        <div className="bg-panel rounded-lg shadow-lg border border-border-main flex flex-col h-full overflow-hidden transition-colors">
            <div className="px-5 py-4 border-b border-border-main flex items-center justify-between shrink-0 bg-panel-header/50 backdrop-blur-sm relative z-20">
                <div className="flex items-center gap-2">
                    <Database size={18} className="text-pink-400" />
                    <h3 className="font-semibold text-main uppercase tracking-wider text-sm">
                        Recent Slow Queries
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted bg-panel-header px-2 py-1 rounded">
                        TOP 50
                    </span>
                    <button
                        onClick={onRefresh}
                        className="text-muted hover:text-text-accent transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-text-accent' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto relative z-10 w-full rounded-b-lg">
                <table className="text-left text-sm text-main table-fixed min-w-full w-full">
                    <thead className="text-xs uppercase bg-panel-header/80 backdrop-blur-md text-muted sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-medium w-32">Time</th>
                            <th className="px-4 py-3 font-medium w-[40%]">Query Preview</th>
                            <th className="px-4 py-3 font-medium text-right w-28">Duration</th>
                            <th className="px-4 py-3 font-medium text-center w-20">Status</th>
                            <th className="px-4 py-3 font-medium text-center w-24">Thread</th>
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
                                            {formatDate(query.executedAt)}
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
                                        <td className="px-4 py-3 text-center text-xs text-muted truncate" title={query.executingThread || 'Thread'}>
                                            {query.executingThread?.split('-').pop() || 'N/A'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentSqlList;
