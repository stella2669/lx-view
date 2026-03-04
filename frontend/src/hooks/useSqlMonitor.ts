import { useState, useEffect } from 'react';
import type { StatAppSql, LogAppSlowQuery } from '../types/sql';

const API_BASE = 'http://localhost:8080/api/v1/monitor/sql';

export const useSqlMonitor = (appId: number = 1, minutes: number = 30) => {
    const [stats, setStats] = useState<StatAppSql[]>([]);
    const [recentSlow, setRecentSlow] = useState<LogAppSlowQuery[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsRes, slowRes] = await Promise.all([
                fetch(`${API_BASE}/stats?appId=${appId}&minutes=${minutes}`),
                fetch(`${API_BASE}/slow/recent?appId=${appId}&minutes=${minutes}`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (slowRes.ok) setRecentSlow(await slowRes.json());
        } catch (error) {
            console.error('Failed to fetch SQL monitor data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [appId, minutes]);

    return { stats, recentSlow, loading, refetch: fetchData };
};
