import React, { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { CoordinateMath } from '../../core/math/CoordinateMath';
import { ParticleRenderer } from '../../core/renderer/ParticleRenderer';
import { useTransactionDetail } from '../../hooks/useTransactionDetail';
import { ScatterChart } from 'lucide-react';
import BaseChartCard from '../shared/BaseChartCard';

// X-View 스캐터 차트 설정 상수
const TIME_WINDOW_MS = 5 * 60 * 1000; // 차트에 표시할 과거 시간 범위 (5분)
const MIN_Y_MAX_MS = 5000; // Y축(응답시간)의 최소 상한선
const BUCKET_SIZE_MS = 10000; // 최댓값 산출 최적화를 위한 버킷 크기 (10초)
const BUCKET_COUNT = TIME_WINDOW_MS / BUCKET_SIZE_MS; // 버킷 개수 (30개)

const XViewChart: React.FC = () => {
    // 트랜잭션을 마우스로 클릭했을 때 상세 팝업을 띄우기 위한 커스텀 훅 (비동기 Lazy Load)
    const { selectedTxId, loadDetail, closeDetail, detailData, loading } = useTransactionDetail();

    // 드래그 선택 상태 관리
    const [dragBox, setDragBox] = React.useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const [selectedTransactions, setSelectedTransactions] = React.useState<any[]>([]);

    const stylesCacheRef = React.useRef<any>(null);
    const lastThemeRef = React.useRef<string | null>(null);
    const chartHeightRef = React.useRef<number>(5000);

    // [최적화] Y축 최대값 계산 로직 함수화 (onDraw, onHitTest 등에서 공통 사용)
    const getYMax = useCallback((transactions: any[], now: number) => {
        if (transactions.length === 0) return MIN_Y_MAX_MS;
        const buckets = new Int32Array(BUCKET_COUNT);
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            const age = now - tx.timestamp;
            const bIdx = Math.floor(age / BUCKET_SIZE_MS);
            if (bIdx >= 0 && bIdx < BUCKET_COUNT && tx.responseTimeMs > buckets[bIdx]) {
                buckets[bIdx] = tx.responseTimeMs;
            }
        }
        let maxRT = 0;
        for (let i = 0; i < BUCKET_COUNT; i++) if (buckets[i] > maxRT) maxRT = buckets[i];
        return Math.max(MIN_Y_MAX_MS, maxRT + 1000);
    }, []);

    const getCachedStyles = useCallback(() => {
        const currentTheme = useStore.getState().theme;
        if (!stylesCacheRef.current || lastThemeRef.current !== currentTheme) {
            const rootStyle = getComputedStyle(document.documentElement);
            stylesCacheRef.current = {
                gridColor: rootStyle.getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.1)',
                textColor: rootStyle.getPropertyValue('--text-muted').trim() || 'rgba(255, 255, 255, 0.5)',
                axisTitleColor: rootStyle.getPropertyValue('--text-main').trim() || 'rgba(255, 255, 255, 0.7)',
            };
            lastThemeRef.current = currentTheme;
        }
        return stylesCacheRef.current;
    }, []);

    // [중요 로직] 매 프레임(초당 60회) 캔버스에 실제로 점을 찍는 렌더링 콜백 함수
    // useCallback을 통해 함수 참조를 고정, CanvasEngine이 불필요하게 파기/재생성되는 것을 방지함
    const onDraw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
        const styles = getCachedStyles();
        const gridColor = styles.gridColor;
        const textColor = styles.textColor;
        const axisTitleColor = styles.axisTitleColor;

        const transactions = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS; // 화면 왼쪽 끝의 기준 시간

        const yMax = getYMax(transactions, now);
        chartHeightRef.current = yMax; // 최신 yMax를 Ref에 저장하여 비동기 상황 대비

        // 1. 차트 배경의 가로선(Y축 그리드) 및 라벨 렌더링
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.fillStyle = textColor;
        ctx.font = '10px Inter, sans-serif';

        // Y축 그리드 및 라벨 (최대 5개~10개 정도로 눈금 자동 조절)
        ctx.setLineDash([5, 5]);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.beginPath();
        
        const step = yMax > 15000 ? 5000 : 2500; // 눈금 간격 (2.5s 또는 5s)
        for (let val = step; val < yMax; val += step) {
            const y = height - (height * val / yMax);
            ctx.moveTo(35, y); // 라벨 영역(35px)을 띄우고 선을 그리기 시작
            ctx.lineTo(width, y);
            ctx.fillText(`${(val / 1000).toFixed(1)}s`, 30, y - 2);
        }
        ctx.stroke();

        // X축 1분 간격 그리드 및 라벨
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.beginPath();
        // startTime 이후의 가장 첫 번째 '1분 단위' 경계 찾기
        const ONE_MINUTE = 60000;
        const firstMinuteMark = Math.ceil(startTime / ONE_MINUTE) * ONE_MINUTE;

        for (let t = firstMinuteMark; t <= now; t += ONE_MINUTE) {
            // 라벨 영역(35px) 이후부터 차트가 시작되므로 좌표 계산을 보정
            const chartWidth = width - 35;
            const x = 35 + CoordinateMath.calculateX(t - startTime, TIME_WINDOW_MS, chartWidth);

            ctx.moveTo(x, 0);
            ctx.lineTo(x, height - 20); // 하단 라벨 영역(20px) 위까지만 선을 그림

            // 시간 텍스트 (예: 13:01)
            const timeString = new Date(t).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
            ctx.fillText(timeString, x, height - 16);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. 완벽한 X, Y축 직각 기준선 (Baseline) 그리기
        ctx.strokeStyle = axisTitleColor;
        ctx.lineWidth = 2; // 축은 일반 그리드보다 약간 두껍게
        ctx.beginPath();
        // Y축 (세로선)
        ctx.moveTo(35, 0);
        ctx.lineTo(35, height - 20);
        // X축 (가로선)
        ctx.lineTo(width, height - 20);
        ctx.stroke();

        // 3. 축 제목 표시 (Axis Titles)
        ctx.fillStyle = axisTitleColor;
        ctx.font = 'bold 11px Inter, sans-serif';

        // X축 제목 (Time)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        // 가로축 끝부분, 라벨 위쪽에 표시
        ctx.fillText('Time', width, height - 25);

        // Y축 제목 (Response Time)
        ctx.save();
        ctx.translate(12, 15); // 좌측 상단 위치 지정
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Response Time (ms)', 0, 0);
        ctx.restore();

        // [정밀 매칭] 렌더링 루프 시작 전에 선택된 대상을 먼저 확정 (Object Reference 기반)
        // [정밀 매칭] selectedTxId로 정확한 객체 매칭 유도
        let selectedTxObj: any = null;
        if (selectedTxId) {
            for (let i = transactions.length - 1; i >= 0; i--) {
                const tx = transactions[i];
                if (tx.id === selectedTxId) {
                    selectedTxObj = tx;
                    break;
                }
            }
        }
        let sx = 0, sy = 0;

        // [성능 극대화] 수만 개의 트랜잭션을 매 프레임 개별로 drawDot(beginPath -> arc -> fill) 호출하면 
        // 초당 수치십만 번의 WebGL 상태 변경(State Change)이 일어나 GPU 오버헤드(Stuttering)가 발생합니다.
        // 또한 Path2D 변수를 매 프레임 생성하면 무거운 가비지 컬렉터(GC) 스파이크가 발생하여 브라우저가 버벅입니다.
        // 대신 네이티브 C++ 바인딩 수준에서 가장 빠른 ctx.beginPath() 내부 일괄 궤도 수집법을 적용합니다.
        
        // [마이크로 최적화] 매 렌더링마다 2만 번 반복되는 루프 안의 무거운 함수 호출이나 나눗셈을 바깥으로 호이스팅(Hoisting)하여 곱셈 상수화 처리합니다.
        const chartWidth = width - 35;
        const chartHeight = height - 20;
        const widthRatio = chartWidth / TIME_WINDOW_MS;
        const heightRatio = chartHeight / yMax;

        // 1. 정상 트랜잭션 Batch Draw (Draw Call 딱 1번)
        ctx.fillStyle = 'rgba(14, 165, 233, 0.7)';
        ctx.beginPath();
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            if (tx.timestamp < startTime || tx.isError) continue;
            
            // 함수 호출 오버헤드를 막고 나눗셈 대신 빠른 곱셈 연산 적용
            const x = 35 + (tx.timestamp - startTime) * widthRatio;
            const y = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);
            
            ctx.moveTo(x + 2.5, y);
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);

            // [정밀 매칭] 정확히 선택된 그 객체인 경우 좌표 캡처
            if (tx === selectedTxObj) {
                sx = x;
                sy = y;
            }
        }
        ctx.fill();

        // 2. 에러 트랜잭션 Batch Draw (Draw Call 딱 1번)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            if (tx.timestamp < startTime || !tx.isError) continue;
            
            // 함수 호출 오버헤드를 막고 나눗셈 대신 빠른 곱셈 연산 적용
            const x = 35 + (tx.timestamp - startTime) * widthRatio;
            const y = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);
            
            ctx.moveTo(x + 3.5, y);
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);

            // [정밀 매칭] 정확히 선택된 그 객체인 경우 좌표 캡처
            if (tx === selectedTxObj) {
                sx = x;
                sy = y;
            }
        }
        ctx.fill();

        // 3. 대상이 있다면 네온 펄스 링 그리기
        if (selectedTxObj) {
            const color = selectedTxObj.isError ? 'rgba(239, 68, 68, 1)' : 'rgba(99, 102, 241, 1)'; // red-500 or indigo-500
            ParticleRenderer.drawPulseRing(ctx, sx, sy, time, color);
        }

        // 4. 다중 선택된 펄스 효과 그리기
        selectedTransactions.forEach((tx: any) => {
            if (tx.timestamp < startTime) return;
            const chartWidth = width - 35;
            const x = 35 + CoordinateMath.calculateX(tx.timestamp - startTime, TIME_WINDOW_MS, chartWidth);
            const chartHeight = height - 20;
            const y = chartHeight - (chartHeight * Math.min(tx.responseTimeMs, yMax) / yMax);
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // 5. 드래그 중인 영역(Brush) 박스 그리기
        if (dragBox) {
            const bx = Math.min(dragBox.startX, dragBox.endX);
            const by = Math.min(dragBox.startY, dragBox.endY);
            const bw = Math.abs(dragBox.endX - dragBox.startX);
            const bh = Math.abs(dragBox.endY - dragBox.startY);

            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'; // 좀 더 연한 반투명 스카이블루
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);
        }

    }, [selectedTxId, dragBox, selectedTransactions, getCachedStyles]);

    const onHitTest = useCallback((x: number, y: number, width: number, height: number) => {
        const transactions = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;
        const yMax = getYMax(transactions, now);

        const chartWidth = width - 35;
        const chartHeight = height - 20;
        const widthRatio = chartWidth / TIME_WINDOW_MS;
        const heightRatio = chartHeight / yMax;

        // Search backwards to match top visible (last drawn = topmost)
        for (let i = transactions.length - 1; i >= 0; i--) {
            const tx = transactions[i];
            if (tx.timestamp < startTime) continue;

            const px = 35 + (tx.timestamp - startTime) * widthRatio;
            const py = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);

            if (CoordinateMath.getDistance(px, py, x, y) < 10) { 
                return tx;
            }
        }
        return null;
    }, []);

    const onClick = useCallback((hitTx: any | null) => {
        if (hitTx && hitTx.id) {
            loadDetail(hitTx.id);
            setSelectedTransactions([]); // 단일 클릭 시 다중 선택 초기화
        } else {
            closeDetail();
            setSelectedTransactions([]); // 빈 곳 클릭 시 초기화
        }
    }, [loadDetail, closeDetail]);

    // 드래그 이벤트 핸들러
    const onDragStart = useCallback((x: number, y: number) => {
        closeDetail(); // 드래그 시작 시 기존 단일 팝업 닫기
        // 처음엔 시작점과 끝점이 같음
        setDragBox({ startX: x, startY: y, endX: x, endY: y });
    }, [closeDetail]);

    const onDrag = useCallback((startX: number, startY: number, currentX: number, currentY: number) => {
        setDragBox({ startX, startY, endX: currentX, endY: currentY });
    }, []);

    const onDragEnd = useCallback((startX: number, startY: number, endX: number, endY: number) => {
        setDragBox(null); // 드래그 시각 효과 제거

        const bx = Math.min(startX, endX);
        const by = Math.min(startY, endY);
        const bw = Math.abs(endX - startX);
        const bh = Math.abs(endY - startY);

        if (canvasRef.current && (bw > 5 || bh > 5)) {
             const width = canvasRef.current.width / (window.devicePixelRatio || 1);
             const height = canvasRef.current.height / (window.devicePixelRatio || 1);

             const transactions = useStore.getState().transactions;
             const now = Date.now();
             const startTime = now - TIME_WINDOW_MS;

             // 박스 영역 안의 트랜잭션들 필터링
             const selected: any[] = [];
             
             // 최근 것부터 탐색하되 최대 표시 개수 제한 (성능/UI 고려)
             const MAX_SELECT = 50; 

             const yMax = getYMax(transactions, now);

             const chartWidth = width - 35;
             const chartHeight = height - 20;
             const widthRatio = chartWidth / TIME_WINDOW_MS;
             const heightRatio = chartHeight / yMax;

             for (let i = transactions.length - 1; i >= 0; i--) {
                 const tx = transactions[i];
                 if (tx.timestamp < startTime) continue;

                 const px = 35 + (tx.timestamp - startTime) * widthRatio;
                 const py = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);

                 // 점의 중심좌표 px, py가 박스(bx, by, bw, bh) 안에 포함되는지 확인
                 if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
                     selected.push(tx);
                     if (selected.length >= MAX_SELECT) break;
                 }
             }

             setSelectedTransactions(selected);
        }
    }, [loadDetail]);

    const { canvasRef } = useCanvasEngine({
        motionBlur: false, // Scatter chart doesn't need blur
        onDraw,
        onHitTest,
        onClick,
        onDragStart,
        onDrag,
        onDragEnd
    });

    return (
        <BaseChartCard
            title="X-View (Live Scatter)"
            icon={ScatterChart}
            iconColor="text-indigo-400"
        >
            <canvas ref={canvasRef} className="w-full h-full block absolute top-0 left-0" />

            {/* REST API Mock Overlay Layer */}
            {selectedTxId && !selectedTransactions.length && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800/95 border border-indigo-500 p-5 rounded-lg shadow-2xl z-50 text-white min-w-[350px]">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3">
                        <h4 className="font-bold text-indigo-400">Transaction Detail</h4>
                        <button onClick={closeDetail} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                        </div>
                    ) : detailData ? (
                        <div className="text-sm space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="col-span-3 pb-1 border-b border-gray-700/50 flex justify-between">
                                    <span className="text-indigo-300 font-mono">{detailData.txId}</span>
                                    <span className={`font-bold ${(detailData.isError || detailData.error || detailData.httpStatusCode >= 400) ? 'text-red-400' : 'text-green-400'}`}>
                                        {detailData.httpStatusCode}
                                    </span>
                                </div>
                                <div className="text-gray-400">Service</div>
                                <div className="col-span-2 text-gray-200 truncate">{detailData.serviceName}</div>
                                
                                <div className="text-gray-400">Time</div>
                                <div className="col-span-2 text-gray-200">{new Date(detailData.timestamp).toLocaleString()}</div>
                                
                                <div className="text-gray-400">Duration</div>
                                <div className="col-span-2 text-indigo-400 font-bold">{detailData.responseTimeMs} ms</div>

                                {detailData.httpMethod && (
                                    <>
                                        <div className="text-gray-400">Request</div>
                                        <div className="col-span-2 text-gray-200">
                                            <span className="text-indigo-400 font-bold mr-2">{detailData.httpMethod}</span>
                                            {detailData.requestUrl}
                                        </div>
                                    </>
                                )}
                            </div>

                            {(detailData.isError || detailData.error || detailData.httpStatusCode >= 400) && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="text-red-400 font-semibold mb-1 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        {detailData.exceptionName || 'Error Detail'}
                                    </p>
                                    <p className="text-xs text-red-300 mb-3 bg-red-950/30 p-2 rounded border border-red-900/50">
                                        {detailData.errorMessage || 'No error message available'}
                                    </p>
                                    
                                    {detailData.stackTrace && (
                                        <>
                                            <p className="text-gray-400 mb-2 text-xs">Stack Trace</p>
                                            <pre className="text-[10px] leading-tight text-gray-400 bg-gray-950 p-3 rounded overflow-x-auto max-h-40 border border-gray-800 custom-scrollbar font-mono">
                                                {detailData.stackTrace}
                                            </pre>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Drag Selection Overlay */}
            {selectedTransactions.length > 0 && (
                <div className="absolute right-4 top-12 bg-gray-800/95 border border-sky-500 p-4 rounded-lg shadow-2xl z-50 text-white w-80 max-h-[80%] flex flex-col">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2 shrink-0">
                        <h4 className="font-bold text-sky-400">Selected Transactions ({selectedTransactions.length})</h4>
                        <button onClick={() => setSelectedTransactions([])} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                    </div>
                    <div className="overflow-y-auto pr-2 space-y-2 flex-1 min-h-0 custom-scrollbar">
                        {selectedTransactions.map(tx => (
                            <div key={tx.id} 
                                 className="text-xs bg-gray-900 border border-gray-700 p-2 rounded cursor-pointer hover:border-indigo-500 transition-colors"
                                 onClick={() => loadDetail(tx.id)}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-gray-400">{tx.id.substring(0, 8)}...</span>
                                    <span className={tx.isError ? "text-red-400" : "text-sky-400"}>
                                        {tx.responseTimeMs}ms
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-gray-500">
                                    <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                                    {tx.isError && <span className="bg-red-900/50 text-red-200 px-1 rounded">Error</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </BaseChartCard>
    );
};

export default XViewChart;
