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

        // O(1) GC Limit: 배열 전체 복사([...state]) 및 filter() 대신, 시간 범위 밖의 요소를 찾아 slice
        let cutoff = 0;
        for (let i = 0; i < state.transactions.length; i++) {
            if (state.transactions[i].timestamp >= fiveMinsAgo) {
                cutoff = i;
                break;
            }
        }
        if (state.transactions.length > 0 && cutoff === 0 && state.transactions[state.transactions.length - 1].timestamp < fiveMinsAgo) {
            cutoff = state.transactions.length; // 모두 5분 이전 데이터인 경우
        }

        const baseTxs = cutoff > 0 ? state.transactions.slice(cutoff) : state.transactions;
        const updatedTxs = [...baseTxs];
        
        // 프론트엔드 레벨 중복 제거 (웹소켓에서 동시에/연달아 전송되는 중복 txId 방어)
        const MAX_LOOKBACK = 2000;
        for (let i = 0; i < newData.length; i++) {
            const tx = newData[i];
            let foundIndex = -1;
            
            const searchLimit = Math.max(0, updatedTxs.length - MAX_LOOKBACK);
            for (let j = updatedTxs.length - 1; j >= searchLimit; j--) {
                if (updatedTxs[j].id === tx.id) {
                    foundIndex = j;
                    break;
                }
            }

            if (foundIndex !== -1) {
                const existing = updatedTxs[foundIndex];
                // 더 긴 수행시간 보장 및 isError 플래그 OR 병합
                if (tx.responseTimeMs > existing.responseTimeMs) {
                    updatedTxs[foundIndex] = { ...tx, isError: existing.isError || tx.isError };
                } else if (!existing.isError && tx.isError) {
                    updatedTxs[foundIndex] = { ...existing, isError: true };
                }
            } else {
                updatedTxs.push(tx);
            }
        }

        let updated = updatedTxs;

        // 하드 캡(Hard Cap): 메모리 방어 및 캔버스 렌더링 한계 보장 (최대 20,000개)
        const MAX_ITEMS = 20000;
        if (updated.length > MAX_ITEMS) {
            updated = updated.slice(updated.length - MAX_ITEMS);
        }

        // 응답 상태 통계 사전 계산
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
