import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../../store/useStore';
import type { TransactionData } from '../../store/useStore';
import TransactionListModal from './TransactionListModal';
import { BarChart2 } from 'lucide-react';
import BaseChartCard from '../shared/BaseChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';

const ResponseStats: React.FC = () => {
    const responseStats = useStore(state => state.responseStats);
    const { colors, defaultTooltip, defaultGrid, defaultXAxis, defaultYAxis } = useChartTheme();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [filteredTxs, setFilteredTxs] = useState<TransactionData[]>([]);

    const timeData = [
        { value: responseStats.under1, name: '< 1s', itemStyle: { color: colors.success } },
        { value: responseStats.under3, name: '< 3s', itemStyle: { color: colors.secondary } },
        { value: responseStats.under5, name: '< 5s', itemStyle: { color: colors.warning } },
        { value: responseStats.over5, name: '> 5s', itemStyle: { color: colors.error } }
    ];

    const statusData = [
        { value: responseStats.normal, name: 'Normal', itemStyle: { color: colors.success } },
        { value: responseStats.error, name: 'Error', itemStyle: { color: colors.error } }
    ];

    const option = {
        tooltip: defaultTooltip,
        grid: {
            ...defaultGrid,
            left: '55%',
            right: '5%'
        },
        xAxis: [
            {
                ...defaultXAxis,
                data: statusData.map(d => d.name),
                axisLabel: { ...defaultXAxis.axisLabel, interval: 0 }
            }
        ],
        yAxis: [
            defaultYAxis
        ],
        series: [
            {
                name: 'Latency',
                type: 'pie',
                radius: ['45%', '75%'],
                center: ['25%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 4,
                    borderColor: colors.grid,
                    borderWidth: 2
                },
                label: { show: false, position: 'center' },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#fff', formatter: '{b}\n{d}%' }
                },
                labelLine: { show: false },
                data: timeData
            },
            {
                name: 'Status Code',
                type: 'bar',
                barWidth: '40%',
                itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: statusData.map(d => ({
                    value: d.value,
                    name: d.name, // 누락된 Name 필드 추가
                    itemStyle: d.itemStyle
                }))
            }
        ]
    };

    const totalRequests = responseStats.normal + responseStats.error;

    // 함수 참조(Reference)가 바뀌어 이벤트를 놓치지 않도록 useCallback 처리
    const handleChartClick = React.useCallback((params: any) => {
        if (!params || !params.name) return;

        let filtered: TransactionData[] = [];
        const category = params.name;
        // 클릭 순간 전역 스토어에서 가장 최신의 트랜잭션 데이터를 바로 꺼내 옴 (리렌더링 방지)
        const currentTxs = useStore.getState().transactions;

        if (category === '< 1s') {
            filtered = currentTxs.filter(tx => tx.responseTimeMs < 1000);
        } else if (category === '< 3s') {
            filtered = currentTxs.filter(tx => tx.responseTimeMs >= 1000 && tx.responseTimeMs < 3000);
        } else if (category === '< 5s') {
            filtered = currentTxs.filter(tx => tx.responseTimeMs >= 3000 && tx.responseTimeMs < 5000);
        } else if (category === '> 5s') {
            filtered = currentTxs.filter(tx => tx.responseTimeMs >= 5000);
        } else if (category === 'Normal') {
            filtered = currentTxs.filter(tx => (tx.httpStatusCode >= 200 && tx.httpStatusCode < 400) && !tx.isError);
        } else if (category === 'Error') {
            filtered = currentTxs.filter(tx => tx.httpStatusCode >= 400 || tx.isError);
        }

        filtered.sort((a, b) => b.timestamp - a.timestamp);
        setFilteredTxs(filtered.slice(0, 50));
        setModalTitle(category);
        setIsModalOpen(true);
    }, []);

    // onClick Event가 매 렌더링마다 덮어씌워지지 않도록 메모이제이션
    const chartEvents = React.useMemo(() => ({
        click: handleChartClick
    }), [handleChartClick]);

    return (
        <>
            <BaseChartCard
                title="Response Stats"
                icon={BarChart2}
                iconColor="text-pink-400"
                rightLabel="LAST 5 MIN"
                isEmpty={totalRequests === 0}
                emptyMessage="Awaiting transaction data..."
            >
                <ReactECharts
                    option={option}
                    style={{ height: '100%', width: '100%', position: 'absolute', top: 0, bottom: 0 }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={false}
                    onEvents={chartEvents}
                />
            </BaseChartCard>

            <TransactionListModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
                transactions={filteredTxs}
            />
        </>
    );
};

export default ResponseStats;
