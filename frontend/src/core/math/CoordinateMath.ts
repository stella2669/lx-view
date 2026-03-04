export const CoordinateMath = {
    /**
     * 무작위(Random) Y좌표를 부여하되, 특정 트랜잭션 ID에 대해선 항상 '동일한' Y좌표를 반환합니다.
     * 원리: ID 문자열을 ASCII 해시(Hash)값으로 변경 후, 삼각함수(Sin)를 돌려서 일관된 난수(0~1)를 생성.
     * 이를 통해 컴포넌트가 다시 렌더링 되어도 각 점이 화면에서 깜빡이지 않고 본인만의 Y위치를 고정으로 가집니다.
     */
    getPseudoRandomY: (id: string, min: number, max: number): number => {
        if (!id) return min + (max - min) / 2;
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const randomX = Math.abs(Math.sin(hash));
        return min + (randomX * (max - min));
    },

    /**
     * 경과된 시간(Elapsed)을 캔버스의 실제 물리적인 픽셀 넓이(X축)로 환산시켜줍니다.
     * 결과는 0px부터 canvasWidth 사이의 값으로 떨어집니다 (비율 계산).
     */
    calculateX: (elapsedMs: number, totalDurationMs: number, canvasWidth: number): number => {
        const progress = Math.min(Math.max(elapsedMs / totalDurationMs, 0), 1);
        return canvasWidth * progress;
    },

    /**
     * 유클리드 기하학의 피타고라스 정리를 이용해 두 점 (x1, y1) 과 (x2, y2) 사이의 직선 거리를 구합니다.
     * 캔버스에서 마우스 포인터와 점 사이를 충돌체크(Hit-Test) 할 때 사용됩니다.
     */
    getDistance: (x1: number, y1: number, x2: number, y2: number): number => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
};
