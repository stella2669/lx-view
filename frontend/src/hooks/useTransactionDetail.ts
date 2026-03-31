import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

/**
 * [REST API 지연 로딩(Lazy-Load) 추상화 훅]
 * 수만 개의 트랜잭션 도트를 그릴 때 모든 상세 정보를 들고 있으면 메모리가 터지므로,
 * 가벼운 상태(속도, 에러여부)만 그려놓고 "클릭된 순간에만" 백엔드에서 뚱뚱한 에러 스택 정보를 가져오는 패턴.
 */
export function useTransactionDetail() {
    const [selectedTxId, setSelectedTxId] = useState<string | null>(null); // 현재 클릭된 점의 ID
    const [detailData, setDetailData] = useState<any | null>(null);        // API 통신으로 가져온 상세 로그 정보 모음
    const [loading, setLoading] = useState(false);                         // 로딩 스피너 표시 여부
    const [error, setError] = useState<string | null>(null);               // 에러 메시지

    // 외부에서 클릭했을 때 호출할 데이터 로드 함수
    const loadDetail = useCallback(async (id: string) => {
        setSelectedTxId(id);
        setLoading(true);
        setDetailData(null); // Clear previous data before loading
        setError(null);      // Clear previous error
        try {
            // 더 안전하고 확실하게 동작하도록 GET /api/transactions/detail?txId=... 방식을 사용.
            // (PathVariable 이슈 및 POST 403 차단 문제 해결)
            const response = await apiFetch(`/api/transactions/detail?txId=${encodeURIComponent(id)}`, {
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch transaction detail: ${response.status}`);
            }
            const data = await response.json();
            if (!data) {
                throw new Error('No data found for this ID');
            }
            // 응답받은 단일 객체를 바로 상태로 설정
            setDetailData(data);
        } catch (err: any) {
            console.error('Failed to load transaction detail:', err);
            setError(err.message || 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    // 상세 보기 팝업 닫기 함수
    const closeDetail = useCallback(() => {
        setSelectedTxId(null);
        setDetailData(null);
        setError(null);
    }, []);

    return { selectedTxId, detailData, loading, error, loadDetail, closeDetail };
}
