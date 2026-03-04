import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../../store/useStore';
import BaseChartCard from '../shared/BaseChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';
import { Server } from 'lucide-react';

const ActiveServiceChart: React.FC = () => {
    const activeServices = useStore(state => state.activeServices);
    const theme = useChartTheme();

    const option = useMemo(() => {
        const categories = activeServices.map(s => s.serviceName);
        const data = activeServices.map(s => s.activeCount);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                ...theme.defaultTooltip,
                axisPointer: { type: 'shadow' }
            },
            grid: theme.defaultGrid,
            xAxis: {
                ...theme.defaultXAxis,
                data: categories,
                axisLabel: {
                    ...theme.defaultXAxis.axisLabel,
                    interval: 0,
                    rotate: 15
                }
            },
            yAxis: {
                ...theme.defaultYAxis,
                max: 100
            },
            series: [
                {
                    name: 'Active Requests',
                    type: 'bar',
                    data: data,
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: theme.colors.primary }, // Theme primary
                                { offset: 1, color: theme.colors.secondary }  // Theme secondary
                            ]
                        },
                        shadowBlur: 10,
                        shadowColor: theme.colors.primary,
                        borderRadius: [4, 4, 0, 0]
                    },
                    barWidth: '50%',
                    animationEasing: 'elasticOut',
                    animationDurationUpdate: 300
                }
            ]
        };
    }, [activeServices, theme]); // theme 의존성 추가

    // Active Service가 아예 0건일 때를 대비한 분기 처리
    const totalActive = activeServices.reduce((sum, s) => sum + s.activeCount, 0);

    return (
        <BaseChartCard
            title="Active Services"
            icon={Server}
            iconColor="text-cyan-400"
            isEmpty={totalActive === 0}
            emptyMessage="No active services at this moment."
        >
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
                notMerge={false}
                lazyUpdate={true}
            />
        </BaseChartCard>
    );
};

export default ActiveServiceChart;
