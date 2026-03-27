import { useEffect, useRef } from 'react';
import type { EChartsType } from 'echarts/core';

/**
 * ECharts 인스턴스를 컨테이너 리사이즈에 맞춰 자동으로 재계산합니다.
 * react-grid-layout에서 패널 크기를 변경할 때 차트가 패널을 초과하는 버그를 방지합니다.
 */
export function useChartResize(containerRef: React.RefObject<HTMLElement | null>) {
    const chartInstanceRef = useRef<EChartsType | null>(null);

    // ECharts 인스턴스를 등록하는 콜백 (ReactECharts의 onChartReady에서 호출)
    const registerChart = (instance: any) => {
        chartInstanceRef.current = instance as EChartsType;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            if (chartInstanceRef.current) {
                // 패널 크기가 바뀔 때마다 ECharts에게 강제 resize 명령
                chartInstanceRef.current.resize();
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    return { registerChart };
}
