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
        try {
            // [실제 구현 시 이 부분을 Axios나 Fetch로 대체]
            // 예시: const res = await axios.get(`/api/v1/logs/error/${id}`);
            //      setDetailData(res.data);

            // 현재는 0.3초 동안 서버와 통신하는 것처럼 흉내(Mock)만 냅니다.
            await new Promise(resolve => setTimeout(resolve, 300));
            setDetailData({
                id,
                message: "Database connection timeout (Simulated detail)",
                timestamp: Date.now(),
                stackTrace: "java.sql.SQLTransientConnectionException: Connection is not available, request timed out after 30005ms.\n\tat com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)\n\tat com.apm.dashboard.service.MockService.execute(MockService.java:42)"
            });
        } catch (err) {
            console.error('Failed to load transaction detail:', err);
        } finally {
            setLoading(false); // 성공하든 실패하든 로딩 스피너 제거
        }
    }, []);

    // 상세 보기 팝업 닫기 함수
    const closeDetail = useCallback(() => {
        setSelectedTxId(null);
        setDetailData(null);
    }, []);

    return { selectedTxId, detailData, loading, loadDetail, closeDetail };
}
