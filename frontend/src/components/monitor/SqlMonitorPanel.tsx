import React, { useState } from 'react';
import { useSqlMonitor } from '../../hooks/useSqlMonitor';
import SqlPerformanceChart from './SqlPerformanceChart';
import RecentSqlList from './RecentSqlList';
import SqlDetailModal from '../shared/SqlDetailModal';
import type { LogAppSlowQuery } from '../../types/sql';

const SqlMonitorPanel: React.FC = () => {
    const { stats, recentSlow, loading, refetch } = useSqlMonitor(1, 30); // Last 30 mins
    const [selectedSql, setSelectedSql] = useState<LogAppSlowQuery | null>(null);

    return (
        <div className="flex flex-col xl:flex-row gap-6 w-full h-full">
            <div className="flex-1 min-w-[30%] h-full">
                <SqlPerformanceChart stats={stats} loading={loading} />
            </div>
            <div className="flex-[2] h-full flex flex-col">
                <RecentSqlList
                    recentSlow={recentSlow}
                    loading={loading}
                    onRowClick={setSelectedSql}
                    onRefresh={refetch}
                />
            </div>

            {selectedSql && (
                <SqlDetailModal
                    isOpen={!!selectedSql}
                    onClose={() => setSelectedSql(null)}
                    sqlData={selectedSql}
                />
            )}
        </div>
    );
};

export default SqlMonitorPanel;
