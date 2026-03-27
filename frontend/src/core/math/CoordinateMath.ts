// [Anti-Gravity] 캔버스 좌표 <-> 데이터 역산 유틸리티
// 모든 연산은 순수 함수(Pure Function)로 유지하여 테스트 가능성과 재사용성을 극대화합니다.

/** progress 값을 0~1로 안전하게 클램핑하는 인라인 헬퍼 */
const clamp01 = (v: number): number => v < 0 ? 0 : v > 1 ? 1 : v;

export const CoordinateMath = {
    /**
     * 무작위(Random) Y좌표를 부여하되, 특정 트랜잭션 ID에 대해선 항상 '동일한' Y좌표를 반환합니다.
     * 원리: ID 문자열을 ASCII 해시(Hash)값으로 변경 후, 삼각함수(Sin)를 돌려서 일관된 난수(0~1)를 생성.
     * 이를 통해 컴포넌트가 다시 렌더링 되어도 각 점이 화면에서 깜빡이지 않고 본인만의 Y위치를 고정으로 가집니다.
     */
    getPseudoRandomY: (id: string, min: number, max: number): number => {
        if (!id) return (min + max) / 2;
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Math.abs(sin) -> [0, 1) 범위의 결정적(Deterministic) 난수
        return min + (Math.abs(Math.sin(hash)) * (max - min));
    },

    /**
     * 경과된 시간(Elapsed)을 캔버스의 실제 물리적인 픽셀 넓이(X축)로 환산시켜줍니다.
     * 결과는 0px부터 canvasWidth 사이의 값으로 떨어집니다 (비율 계산).
     */
    calculateX: (elapsedMs: number, totalDurationMs: number, canvasWidth: number): number => {
        return canvasWidth * clamp01(elapsedMs / totalDurationMs);
    },

    /**
     * 픽셀 X 좌표를 타임스탬프로 역산 (0px -> now - totalDurationMs, width -> now)
     */
    calculateTimestampFromX: (x: number, chartWidth: number, now: number, totalDurationMs: number): number => {
        return (now - totalDurationMs) + clamp01(x / chartWidth) * totalDurationMs;
    },

    /**
     * 픽셀 Y 좌표를 응답시간(ms)으로 역산 (Y축은 반전: 위쪽=빠름, 아래쪽=느림)
     */
    calculateRTFromY: (y: number, chartHeight: number, yMax: number): number => {
        return (1 - clamp01(y / chartHeight)) * yMax;
    },

    /**
     * 유클리드 기하학의 피타고라스 정리를 이용해 두 점 사이의 직선 거리를 구합니다.
     * Math.hypot는 부동소수점 overflow에 안전하며 JIT 컴파일러 최적화를 받습니다.
     * 캔버스에서 마우스 포인터와 점 사이를 충돌체크(Hit-Test) 할 때 사용됩니다.
     */
    getDistance: (x1: number, y1: number, x2: number, y2: number): number => {
        return Math.hypot(x2 - x1, y2 - y1);
    }
};
