import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { Activity } from 'lucide-react';
import BaseChartCard from '../shared/BaseChartCard';

interface Particle {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    colorIdx: number;
    size: number;
    state: 'REQ' | 'PROCESSING' | 'RES';
    targetX?: number;
    waitTime?: number;
}

// [성능 극대화] 다크모드에서 수천 번 발생하는 막대한 그림자 연산(shadowBlur) 부하를 없애기 위한 오프스크린 캔버스 캐시
// (문자열 해시맵의 탐색/할당 부하마저 완전히 제거하기 위해 O(1) 다차원 배열 인덱싱 사용)
// 구조: spriteCacheArray[isLight ? 1 : 0][colorIdx][size - 2]
const spriteCacheArray: HTMLCanvasElement[][][] = [
    [[], [], []], // Dark mode caches (colorIdx 0, 1, 2)
    [[], [], []]  // Light mode caches (colorIdx 0, 1, 2)
];

function getSprite(colorIdx: number, colorStr: string, size: number, isLight: boolean): HTMLCanvasElement {
    const themeIdx = isLight ? 1 : 0;
    const sizeIdx = size - 2; // size is 2, 3, or 4

    let canvas = spriteCacheArray[themeIdx][colorIdx][sizeIdx];
    if (!canvas) {
        canvas = document.createElement('canvas');
        const blurAmount = isLight ? 0 : 10;
        const radius = size + blurAmount;
        
        canvas.width = radius * 2;
        canvas.height = radius * 2;
        const ctx = canvas.getContext('2d')!;
        
        ctx.beginPath();
        ctx.arc(radius, radius, size, 0, Math.PI * 2);
        ctx.fillStyle = colorStr;
        if (!isLight) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = colorStr;
        }
        ctx.fill();
        
        spriteCacheArray[themeIdx][colorIdx][sizeIdx] = canvas;
    }
    return canvas;
}

const TransactionFlow: React.FC = () => {
    // We keep a local particles ref to manage animation without react re-renders
    const particlesRef = useRef<Particle[]>([]);
    const lastTxTimeRef = useRef<number>(0);
    const spawnQueueRef = useRef<any[]>([]); // Queue to smooth out bursts

    const stylesCacheRef = useRef<any>(null);
    const lastThemeRef = useRef<string | null>(null);

    const getCachedStyles = () => {
        const currentTheme = useStore.getState().theme;
        if (!stylesCacheRef.current || lastThemeRef.current !== currentTheme) {
            const rootStyle = getComputedStyle(document.documentElement);
            stylesCacheRef.current = {
                borderColor: rootStyle.getPropertyValue('--border-color').trim() || '#374151',
                panelColor: rootStyle.getPropertyValue('--bg-panel').trim() || '#1e2330',
                accentColor: rootStyle.getPropertyValue('--text-accent').trim() || '#22d3ee',
                textColor: rootStyle.getPropertyValue('--text-main').trim() || '#ffffff',
                textMuted: rootStyle.getPropertyValue('--text-muted').trim() || '#9ca3af',
                bgBase: rootStyle.getPropertyValue('--bg-base').trim() || '#1e2330',
            };
            lastThemeRef.current = currentTheme;
        }
        return stylesCacheRef.current;
    };

    const onDraw = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
        // [수정됨] ctx.clearRect(...)는 CanvasEngine이 내부적으로 motionBlur와 함께 처리하므로 제거해야 합니다.
        // 엔진이 그려둔 배경(모션 블러 혹은 기본 클리어)을 덮어쓰지 않고 바로 그 위에 컴포넌트들을 그려나갑니다.

        const styles = getCachedStyles();
        const borderColor = styles.borderColor;
        const panelColor = styles.panelColor;
        const accentColor = styles.accentColor;

        // Draw Background Tube
        ctx.fillStyle = panelColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        // Define tube regions
        const reqWidth = width * 0.4;
        const processingWidth = width * 0.2;
        const resWidth = width * 0.4;

        const tubeY1 = height * 0.2;
        const tubeY2 = height * 0.8;

        // Draw Tube borders
        ctx.beginPath();
        ctx.moveTo(0, height * 0.4);
        ctx.lineTo(reqWidth, tubeY1);
        ctx.lineTo(reqWidth + processingWidth, tubeY1);
        ctx.lineTo(width, height * 0.4);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, height * 0.6);
        ctx.lineTo(reqWidth, tubeY2);
        ctx.lineTo(reqWidth + processingWidth, tubeY2);
        ctx.lineTo(width, height * 0.6);
        ctx.stroke();

        // 1. Check for new transactions and add them to the spawn queue
        // Read latest transactions dynamically to bypass React render cycle (60fps stutter fix)
        const currentTxs = useStore.getState().transactions;
        if (currentTxs.length > 0) {
            if (lastTxTimeRef.current === 0) {
                // On first mount, take the last 50 transactions to prime the pump and start flowing!
                const initialBatch = currentTxs.slice(-50);
                spawnQueueRef.current.push(...initialBatch);
                lastTxTimeRef.current = initialBatch[initialBatch.length - 1].timestamp;
            } else {
                // [성능 극대화] 전체 배열 2만 개를 매 프레임 .filter()로 스캔하면 초당 120만 회 루프로 브라우저가 버버벅거립니다(GC Spike). (Stuttering 원인)
                // 대신 최신 데이터부터 역순 탐색 후 즉시 break 처리하여 연산량을 거의 0으로 만듭니다.
                const newTxs: any[] = [];
                for (let i = currentTxs.length - 1; i >= 0; i--) {
                    if (currentTxs[i].timestamp <= lastTxTimeRef.current) break;
                    newTxs.push(currentTxs[i]);
                }
                newTxs.reverse(); // 뒤에서부터 가져왔으므로 순서 복구

                if (newTxs.length > 0) {
                    spawnQueueRef.current.push(...newTxs);
                    // Update latest seen timestamp
                    lastTxTimeRef.current = newTxs[newTxs.length - 1].timestamp;
                }
            }
        }

        // 2. Smoothly spawn particles from the queue (bursts come every 5s)
        if (spawnQueueRef.current.length > 0) {
            // [메모리 팽창 방지] 대기열 무한 증식(Leak) 강제 억제 캡(Hard Cap)
            if (spawnQueueRef.current.length > 1000) {
                spawnQueueRef.current = spawnQueueRef.current.slice(-1000);
            }

            const spawnRate = Math.max(0.5, spawnQueueRef.current.length / 60);
            let spawnCount = Math.floor(spawnRate);
            if (Math.random() < (spawnRate - spawnCount)) spawnCount += 1;

            if (particlesRef.current.length > 2000) spawnCount = 0;

            for (let i = 0; i < spawnCount; i++) {
                const tx = spawnQueueRef.current.shift();
                if (!tx) break;

                const actualWaitTimeMs = tx.responseTimeMs;
                const waitFrames = Math.max(10, Math.floor(actualWaitTimeMs / (3000 / 60)));

                particlesRef.current.push({
                    x: 0,
                    y: height * 0.4 + Math.random() * (height * 0.2), // Start at REQ mouth
                    speedX: 2 + Math.random() * 3,
                    speedY: (Math.random() - 0.5) * 2,
                    colorIdx: Math.floor(Math.random() * 3), // 3 palette colors
                    size: Math.floor(2 + Math.random() * 3), // 2, 3, or 4 (Sprite 캐싱을 위해 정수형 고정)
                    state: 'REQ',
                    targetX: reqWidth + 20 + Math.random() * (processingWidth - 40),
                    waitTime: waitFrames
                });
            }
        }

        // Update & Draw Particles
        const currentTheme = useStore.getState().theme;
        const isLight = currentTheme === 'light' || currentTheme === 'solarized-light';
        const particleColors = isLight
            ? ['#0ea5e9', '#0284c7', '#2563eb'] // Deeper sky/blue for light mode
            : ['#05d9e8', '#01ffe5', '#3273f6']; // Neon cyans for dark mode

        // [성능 극대화] 'lighter'(가산 혼합) 연산은 픽셀 단위로 배경색을 읽기 때문에 스프라이트 캐싱을 무용지물로 만들만큼 극도로 무겁습니다.
        // 이미 Sprite 이미지에 섀도우가 베이크되어 있으므로, 하드웨어 가속이 적용되는 'source-over' 알파 블렌딩만 씁니다.
        ctx.globalCompositeOperation = 'source-over';

        let reqCount = 0;
        let processCount = 0;
        let resCount = 0;

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            let isWaiting = false;

            if (p.x < reqWidth) {
                p.state = 'REQ';

                // [버그픽스] PROCESSING 대기 중 speedX=0으로 설정된 파티클이 지터(jitter)로 REQ 영역으로
                // 밀려 들어왔을 때 계속 멈춰있는 버그 수정. REQ 상태에선 반드시 전진해야 합니다.
                if (p.speedX <= 0) {
                    p.speedX = 2 + Math.random() * 2;
                    p.speedY = (Math.random() - 0.5) * 2;
                }

                const progress = p.x / reqWidth;
                const allowedMaxY = height * 0.6 + progress * (height * 0.2);
                const allowedMinY = height * 0.4 - progress * (height * 0.2);

                if (p.y > allowedMaxY) p.y = allowedMaxY;
                if (p.y < allowedMinY) p.y = allowedMinY;

            } else if (p.x < reqWidth + processingWidth) {
                p.state = 'PROCESSING';

                if ((p.targetX && p.x >= p.targetX) || (p.speedX === 0 && p.waitTime! > 0)) {
                    isWaiting = true;
                    p.waitTime! -= 1;

                    p.x += (Math.random() - 0.5) * 1.5;
                    p.x = Math.max(reqWidth, Math.min(reqWidth + processingWidth - 2, p.x));
                    p.y += (Math.random() - 0.5) * 1.5;
                    p.y = Math.min(tubeY2, Math.max(tubeY1, p.y));
                    p.speedX = 0;
                    p.speedY = 0;
                } else if (p.waitTime! <= 0 && p.speedX === 0) {
                    p.speedX = 3 + Math.random() * 2;
                    p.speedY = (Math.random() - 0.5) * 2;
                    p.targetX = undefined;
                }

                if (!isWaiting) {
                    if (p.y < tubeY1 || p.y > tubeY2) {
                        p.speedY *= -1;
                        p.y = Math.min(tubeY2, Math.max(tubeY1, p.y));
                    }
                }
            } else {
                p.state = 'RES';

                if (p.speedX === 0) {
                    p.speedX = 3 + Math.random() * 2;
                    p.speedY = (Math.random() - 0.5) * 2;
                    p.targetX = undefined;
                }

                const progress = (p.x - (reqWidth + processingWidth)) / resWidth;
                const allowedMinY = height * 0.2 + progress * (height * 0.2);
                const allowedMaxY = height * 0.8 - progress * (height * 0.2);

                if (p.y < allowedMinY) {
                    p.y = allowedMinY;
                    p.speedY *= -0.5;
                }
                if (p.y > allowedMaxY) {
                    p.y = allowedMaxY;
                    p.speedY *= -0.5;
                }

                if (p.y > height * 0.5) p.speedY -= 0.1;
                if (p.y < height * 0.5) p.speedY += 0.1;
            }

            if (!isWaiting) {
                p.x += p.speedX;
                p.y += p.speedY;
            }

            // [마이크로 최적화] 어차피 스캔하는 파티클 렌더링 루프! 쓸데없이 2,000바퀴를 다시 도는 아래쪽 카운팅 루프를 지우고, 여기서 한 번에 같이 셉니다.
            if (p.state === 'REQ') reqCount++;
            else if (p.state === 'PROCESSING') processCount++;
            else if (p.state === 'RES') resCount++;

            if (p.state !== 'PROCESSING') {
                const pColor = particleColors[p.colorIdx];
                // [크리티컬 버그 픽스] HMR(Fast Refresh) 이전에 생성된 파티클들의 크기가 소수점(float)을 가질 수 있어, 
                // 매 프레임 무제한으로 캔버스를 생성해버리는 초강력 메모리 누수 방지용 강제 정수화
                const safeSize = Math.floor(p.size);
                // 문자열 연산을 안 쓰는 다차원 배열 인덱싱 호출
                const sprite = getSprite(p.colorIdx, pColor, safeSize, isLight);
                const offset = safeSize + (isLight ? 0 : 10);
                
                // 매 프레임 도형과 블러를 새로 그리는 대신, 이미 완성된 스프라이트를 스탬프처럼 찍음 (하드웨어 가속)
                ctx.drawImage(sprite, p.x - offset, p.y - offset);
            } else {
                // 추가: PROCESSING 상태에서도 파티클 자체를 점/기호 등으로 작게나마 그릴 수 있습니다.
                // 이전 구현에 맞추기 위해 파티클 표시는 안 하더라도 위치 정보는 남겨둘 수 있습니다. (현재 생략) 
            }

            if (p.x > width) {
                // [성능 극대화] .splice(i, 1)는 매번 O(N)으로 전체 배열 요소를 뒤로 미는 엄청난 메모리 부하(Stuttering)를 줍니다.
                // 대신 맨 마지막 요소를 현재 자리에 덮어씌운 뒤 크기를 줄이는 O(1) Pop 방식으로 파티클을 제거합니다.
                particlesRef.current[i] = particlesRef.current[particlesRef.current.length - 1];
                particlesRef.current.pop();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;

        const activeServices = useStore.getState().activeServices;
        const totalActive = activeServices.reduce((sum: any, s: any) => sum + s.activeCount, 0);

        const glowIntensity = Math.min(1.0, totalActive / 500);
        const pulse = (Math.sin(time / 300) + 1) / 2;
        const dynamicOpacity = 0.1 + (glowIntensity * 0.4 * pulse);

        const textColor = styles.textColor;
        const textMuted = styles.textMuted;

        const glowRgb = isLight ? '14, 165, 233' : '1, 255, 229'; // sky-500 vs neon cyan
        ctx.fillStyle = `rgba(${glowRgb}, ${dynamicOpacity})`;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = isLight ? 0 : 20 * glowIntensity;
        ctx.fillRect(reqWidth, tubeY1, processingWidth, tubeY2 - tubeY1);
        ctx.shadowBlur = 0;

        const drawBoxedNumber = (x: number, y: number, value: string, color: string) => {
            // 박스 배경색을 테마 바탕색과 동일하게 하되, 약간 투명하게
            ctx.fillStyle = panelColor;
            ctx.beginPath();
            ctx.roundRect(x - 50, y - 24, 100, 48, 8);
            ctx.fill();

            // 박스 테두리 생성 (추가됨)
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillText(value, x, y);
            ctx.shadowBlur = 0;
        };

        drawBoxedNumber(reqWidth / 2, height / 2, reqCount.toString(), '#ff2a6d');
        drawBoxedNumber(width / 2, height / 2, totalActive.toString(), accentColor);
        drawBoxedNumber(width - resWidth / 2, height / 2, resCount.toString(), '#3273f6');

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = textMuted;
        ctx.fillText('REQ', reqWidth / 2, height * 0.75);
        ctx.fillText('PROCESSING', width / 2, tubeY2 + 20);
        ctx.fillText('RES', width - resWidth / 2, height * 0.75);
    };

    const { canvasRef } = useCanvasEngine<any>({
        onDraw,
        motionBlur: true,
        motionBlurAlpha: 0.95,
        getBgColor: () => getCachedStyles().bgBase
    });

    return (
        <BaseChartCard
            title="Transaction Flow"
            icon={Activity}
            iconColor="text-sky-400"
        >
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
        </BaseChartCard>
    );
};

export default TransactionFlow;
