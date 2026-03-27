import { useState, useEffect, useCallback } from 'react';
import type { UnifiedError } from '../types/error';
import { apiFetch } from '../utils/api';

export const useErrorMonitor = (appId: number = 1, minutes: number = 60, refreshIntervalMs: number = 5000) => {
    const [errors, setErrors] = useState<UnifiedError[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchErrors = useCallback(async () => {
        try {
            const response = await apiFetch(`/api/v1/monitor/errors/recent?appId=${appId}&minutes=${minutes}`);
            if (!response.ok) {
                throw new Error('Failed to fetch error logs');
            }
            const data: UnifiedError[] = await response.json();
            setErrors(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        } finally {
            if (loading) setLoading(false);
        }
    }, [appId, minutes, loading]);

    useEffect(() => {
        fetchErrors(); // Initial fetch
        const interval = setInterval(fetchErrors, refreshIntervalMs);
        return () => clearInterval(interval);
    }, [fetchErrors, refreshIntervalMs]);

    return { errors, loading, error, refetch: fetchErrors };
};
