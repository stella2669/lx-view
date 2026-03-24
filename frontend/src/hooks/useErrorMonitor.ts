import { useState, useEffect, useCallback } from 'react';
import type { UnifiedError } from '../types/error';

// .env 파일 혹은 Vite 기본 설정으로 주입된 백엔드 API 주소 사용
// 외부에서 접속할 때는 브라우저의 현재 호스트를 기반으로 접속되도록 상대 경로 처리
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080`;
export const useErrorMonitor = (appId: number = 1, minutes: number = 60, refreshIntervalMs: number = 5000) => {
    const [errors, setErrors] = useState<UnifiedError[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchErrors = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/monitor/errors/recent?appId=${appId}&minutes=${minutes}`);
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
