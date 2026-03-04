import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export const useChartTheme = () => {
    const theme = useStore(state => state.theme);

    return useMemo(() => {
        // Read CSS variables dynamically from document if possible,
        // or hardcode the mappings for ECharts safety.
        // ECharts doesn't react cleanly to CSS variables without a re-render/re-apply.
        const isLight = theme === 'light' || theme === 'solarized-light';

        const textColor = isLight ? '#4b5563' : '#9ca3af'; // gray-600 vs gray-400
        const gridColor = isLight ? '#e5e7eb' : '#374151'; // gray-200 vs gray-700
        const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 24, 39, 0.95)';
        const tooltipBorder = isLight ? '#e5e7eb' : '#374151';
        const tooltipText = isLight ? '#111827' : '#f3f4f6';

        // Base ECharts theme configuration
        return {
            colors: {
                primary: isLight ? '#2563eb' : '#3b82f6', // blue-600 vs blue-500
                secondary: isLight ? '#0d9488' : '#14b8a6', // teal-600 vs teal-500
                success: '#10b981', // emerald-500
                warning: '#f59e0b', // amber-500
                error: '#ef4444',   // red-500
                text: textColor,
                grid: gridColor,
            },
            defaultGrid: {
                top: 40,
                right: 20,
                bottom: 30,
                left: 60,
                containLabel: true,
                borderColor: gridColor,
            },
            defaultXAxis: {
                axisLine: { lineStyle: { color: gridColor } },
                axisLabel: { color: textColor, fontSize: 11 },
                splitLine: { show: false }
            },
            defaultYAxis: {
                axisLine: { show: false },
                axisLabel: { color: textColor, fontSize: 11 },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed', opacity: 0.5 } }
            },
            defaultTooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                textStyle: { color: tooltipText },
                padding: [8, 12],
                borderRadius: 8,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
        };
    }, [theme]); // Re-calculate when theme changes
};
