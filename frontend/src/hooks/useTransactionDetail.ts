import { useState, useCallback } from 'react';

/**
 * [REST API 지연 로딩(Lazy-Load) 추상화 훅]
 * 수만 개의 트랜잭션 도트를 그릴 때 모든 상세 정보를 들고 있으면 메모리가 터지므로,
 * 가벼운 상태(속도, 에러여부)만 그려놓고 "클릭된 순간에만" 백엔드에서 뚱뚱한 에러 스택 정보를 가져오는 패턴.
 */
export function useTransactionDetail() {
    const [selectedTxId, setSelectedTxId] = useState<string | null>(null); // 현재 클릭된 점의 ID
    const [detailData, setDetailData] = useState<any | null>(null);        // API 통신으로 가져온 상세 로그 정보 모음
    const [loading, setLoading] = useState(false);                         // 로딩 스피너 표시 여부

    // 외부에서 클릭했을 때 호출할 데이터 로드 함수
    const loadDetail = useCallback(async (id: string) => {
        setSelectedTxId(id);
        setLoading(true);
        setDetailData(null); // Clear previous data before loading
        try {
            const response = await fetch(`/api/transactions/${id}`);
            if (!response.ok) {
                // The instruction provided a line that seems to be from a different file and was syntactically incorrect here.
                // To maintain syntactic correctness and fulfill the instruction's intent as much as possible within this file,
                // I'm assuming the user intended to keep the original error handling for the fetch response.
                // The line `if (CoordinateMath.getDistance(px, py, x, y) < 10) {` and `new Error(...)`
                throw new Error(`Failed to fetch transaction detail: ${response.status}`);
            }
            const data = await response.json();
            setDetailData(data);
        } catch (err) {
            console.error('Failed to load transaction detail:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 상세 보기 팝업 닫기 함수
    const closeDetail = useCallback(() => {
        setSelectedTxId(null);
        setDetailData(null);
    }, []);

    return { selectedTxId, detailData, loading, loadDetail, closeDetail };
}
