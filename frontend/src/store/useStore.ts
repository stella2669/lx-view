import { create } from 'zustand';

export interface TransactionData {
    id: string;
    timestamp: number;
    responseTimeMs: number;
    serviceName: string;
    isError: boolean;
    httpStatusCode: number;
}

export interface ActiveServiceData {
    timestamp: number;
    serviceName: string;
    activeCount: number;
}

export interface TopStatsData {
    active: number;
    requests: number;
    errors: number;
    tps: number;
    threads: number;
}

export interface ResponseStatsData {
    under1: number;
    under3: number;
    under5: number;
    over5: number;
    normal: number;
    error: number;
}

export interface JvmMetricsData {
    timestamp: number;
    processCpuLoad: number;
    systemCpuLoad: number;
    heapUsed: number;
    heapMax: number;
    heapCommitted: number;
    heapUsagePercent: number;
    gcCount: number;
    gcTimeMs: number;
    liveThreads: number;
    deadlockedThreads: number;
}

interface DashboardState {
    transactions: TransactionData[];
    activeServices: ActiveServiceData[];
    topStats: TopStatsData | null;
    jvmMetrics: JvmMetricsData | null;
    responseStats: ResponseStatsData;
    theme: string;

    addTransactions: (newData: TransactionData[]) => void;
    updateActiveServices: (newData: ActiveServiceData[]) => void;
    setTopStats: (stats: TopStatsData) => void;
    setJvmMetrics: (metrics: JvmMetricsData) => void;
    setTheme: (theme: string) => void;
}

export const useStore = create<DashboardState>((set) => ({
    transactions: [],
    activeServices: [],
    topStats: null,
    jvmMetrics: null,
    responseStats: { under1: 0, under3: 0, under5: 0, over5: 0, normal: 0, error: 0 },
    theme: 'dark', // default theme

    addTransactions: (newData) => set((state) => {
        const now = Date.now();
        const fiveMinsAgo = now - 5 * 60 * 1000;

        // Append new data, filter out data older than 5 minutes
        const updated = [...state.transactions, ...newData]
            .filter(tx => tx.timestamp >= fiveMinsAgo);

        // Pre-calculate response stats ONCE per store update instead of repeatedly in React components
        const newStats = { under1: 0, under3: 0, under5: 0, over5: 0, normal: 0, error: 0 };
        for (let i = 0; i < updated.length; i++) {
            const tx = updated[i];
            const r = tx.responseTimeMs;
            if (r < 1000) newStats.under1++;
            else if (r < 3000) newStats.under3++;
            else if (r < 5000) newStats.under5++;
            else newStats.over5++;

            if (tx.httpStatusCode >= 200 && tx.httpStatusCode < 400) {
                newStats.normal++;
            } else if (tx.httpStatusCode >= 400 || tx.isError) {
                newStats.error++;
            } else {
                newStats.normal++;
            }
        }

        return { transactions: updated, responseStats: newStats };
    }),
    updateActiveServices: (newData) => set({ activeServices: newData }),
    setTopStats: (stats) => set({ topStats: stats }),
    setJvmMetrics: (metrics) => set({ jvmMetrics: metrics }),
    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
    }
}));
