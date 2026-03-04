import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import BaseChartCard from '../shared/BaseChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';
import { Database } from 'lucide-react';
import type { StatAppSql } from '../../types/sql';
import { DateTime } from 'luxon';

interface SqlPerformanceChartProps {
    stats: StatAppSql[];
    loading?: boolean;
}

const SqlPerformanceChart: React.FC<SqlPerformanceChartProps> = ({ stats, loading }) => {
    const { colors, defaultTooltip, defaultGrid, defaultXAxis } = useChartTheme();

    const option = useMemo(() => {
        const categories = stats.map(s => DateTime.fromISO(s.baseTime).toFormat('HH:mm'));
        const totalCounts = stats.map(s => s.totalExecutionCount);
        const slowCounts = stats.map(s => s.slowQueryCount);

        // Calculate average time safely
        const avgTimes = stats.map(s => s.totalExecutionCount > 0 ? Math.round(s.totalExecutionTimeMs / s.totalExecutionCount) : 0);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                ...defaultTooltip,
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['Total Queries', 'Slow Queries', 'Avg Time (ms)'],
                textStyle: { color: colors.text },
                top: 0
            },
            grid: {
                ...defaultGrid,
                top: 30,
            },
            xAxis: {
                ...defaultXAxis,
                data: categories,
                boundaryGap: true
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Count',
                    nameTextStyle: { color: colors.text, padding: [0, 30, 0, 0] },
                    splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
                    axisLabel: { color: colors.text }
                },
                {
                    type: 'value',
                    name: 'Avg Time(ms)',
                    nameTextStyle: { color: colors.text, padding: [0, 0, 0, 30] },
                    splitLine: { show: false },
                    axisLabel: { color: colors.text }
                }
            ],
            series: [
                {
                    name: 'Total Queries',
                    type: 'bar',
                    data: totalCounts,
                    itemStyle: { color: colors.primary, borderRadius: [2, 2, 0, 0] },
                    barMaxWidth: 30
                },
                {
                    name: 'Slow Queries',
                    type: 'bar',
                    data: slowCounts,
                    itemStyle: { color: colors.error, borderRadius: [2, 2, 0, 0] },
                    barMaxWidth: 30
                },
                {
                    name: 'Avg Time (ms)',
                    type: 'line',
                    yAxisIndex: 1,
                    data: avgTimes,
                    itemStyle: { color: colors.warning },
                    lineStyle: { width: 3, shadowColor: 'rgba(245, 158, 11, 0.5)', shadowBlur: 10 },
                    symbolSize: 6
                }
            ]
        };
    }, [stats, colors, defaultTooltip, defaultGrid, defaultXAxis]);

    return (
        <BaseChartCard
            title="SQL Performance (Last 30 Min)"
            icon={Database}
            iconColor="text-blue-400"
            isEmpty={stats.length === 0 && !loading}
            emptyMessage="No SQL statistics collected yet."
        >
            {loading && stats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">
                    Loading SQL Data...
                </div>
            ) : (
                <ReactECharts
                    option={option}
                    style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
                    notMerge={false}
                    lazyUpdate={true}
                />
            )}
        </BaseChartCard>
    );
};

export default SqlPerformanceChart;
