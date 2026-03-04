import { useEffect, useRef } from 'react';
import type { EngineOptions } from '../core/engine/CanvasEngine';
import { CanvasEngine } from '../core/engine/CanvasEngine';

type UseCanvasEngineProps<T> = Omit<EngineOptions<T>, 'canvas'>;

export function useCanvasEngine<T>(options: UseCanvasEngineProps<T>) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<CanvasEngine<T> | null>(null);

    // Save latest options in refs so the engine doesn't need to rebuild on prop change
    const onDrawRef = useRef(options.onDraw);
    const onHitTestRef = useRef(options.onHitTest);
    const onClickRef = useRef(options.onClick);
    const getBgColorRef = useRef(options.getBgColor);

    useEffect(() => {
        onDrawRef.current = options.onDraw;
        onHitTestRef.current = options.onHitTest;
        onClickRef.current = options.onClick;
        getBgColorRef.current = options.getBgColor;
    }, [options]);

    // 컴포넌트가 처음 화면에 나타날 때(Mount) 단 한 번 실행
    useEffect(() => {
        if (!canvasRef.current) return;

        // 엔진 객체 생성 및 초기 설정 (DPI, 이벤트 리스너 등이 여기서 연결됨)
        engineRef.current = new CanvasEngine<T>({
            canvas: canvasRef.current,
            motionBlur: options.motionBlur,
            motionBlurAlpha: options.motionBlurAlpha,
            getBgColor: () => getBgColorRef.current ? getBgColorRef.current() : '', // ref 통해서 최신값 접근
            // 훅 내부 Ref에 저장해둔 '최신 버전의' 함수를 호출하도록 엔진에게 알려줌
            onDraw: (ctx, width, height, time) => onDrawRef.current(ctx, width, height, time),
            onHitTest: (x, y, w, h) => onHitTestRef.current ? onHitTestRef.current(x, y, w, h) : null,
            onClick: (item, x, y, w, h) => onClickRef.current && onClickRef.current(item, x, y, w, h)
        });

        // 엔진 루프 시작 (requestAnimationFrame 가동)
        engineRef.current.start();

        // 컴포넌트가 화면에서 사라질 때(Unmount) 메모리 누수를 막기 위해 무조건 파기(Clean-up)
        return () => {
            if (engineRef.current) {
                engineRef.current.destroy(); // 애니메이션 중지 및 이벤트 제거
                engineRef.current = null;
            }
        };
        // 만약 블러(Blur) 옵션 같은 구조적인 옵션이 중간에 바뀌면, 엔진을 파기하고 다시 만듦.
    }, [options.motionBlur, options.motionBlurAlpha]);

    // 사용하는 쪽에선 캔버스와 연결할 ref, 그리고 세부 컨트롤을 위한 engine 객체를 반환받음
    return { canvasRef, engine: engineRef.current };
}
