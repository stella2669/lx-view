import React, { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { CoordinateMath } from '../../core/math/CoordinateMath';
import { ParticleRenderer } from '../../core/renderer/ParticleRenderer';
import { useTransactionDetail } from '../../hooks/useTransactionDetail';

// X-View 스캐터 차트 설정 상수
const TIME_WINDOW_MS = 5 * 60 * 1000; // 차트에 표시할 과거 시간 범위 (5분)
const Y_MAX_MS = 6500; // Y축(응답시간)의 최대 상한선 기준. 이 이상 응답시간도 화면 밖으로 가려지지 않게 처리됨.

const XViewChart: React.FC = () => {
    // 트랜잭션을 마우스로 클릭했을 때 상세 팝업을 띄우기 위한 커스텀 훅 (비동기 Lazy Load)
    const { selectedTxId, loadDetail, closeDetail, detailData, loading } = useTransactionDetail();

    // [중요 로직] 매 프레임(초당 60회) 캔버스에 실제로 점을 찍는 렌더링 콜백 함수
    // useCallback을 통해 함수 참조를 고정, CanvasEngine이 불필요하게 파기/재생성되는 것을 방지함
    const onDraw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
        // Get CSS Variables for Theming
        const rootStyle = getComputedStyle(document.documentElement);
        const gridColor = rootStyle.getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.1)';
        const textColor = rootStyle.getPropertyValue('--text-muted').trim() || 'rgba(255, 255, 255, 0.5)';
        const axisTitleColor = rootStyle.getPropertyValue('--text-main').trim() || 'rgba(255, 255, 255, 0.7)';

        const transactions = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS; // 화면 왼쪽 끝의 기준 시간

        // 1. 차트 배경의 가로선(Y축 그리드) 및 라벨 렌더링
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.fillStyle = textColor;
        ctx.font = '10px Inter, sans-serif';

        // Y축 그리드 및 라벨
        ctx.setLineDash([5, 5]);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.beginPath();
        for (let i = 1; i <= Math.floor(Y_MAX_MS / 1000); i++) {
            const y = height - (height * (i * 1000) / Y_MAX_MS);
            ctx.moveTo(35, y); // 라벨 영역(35px)을 띄우고 선을 그리기 시작
            ctx.lineTo(width, y);
            ctx.fillText(`${i}s`, 30, y - 2);
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

        // Highlight selected dot variables
        let selectedTx: any = null;
        let sx = 0, sy = 0;

        // 2. 수만 개의 트랜잭션 데이터를 반복하면서 점(Dot)을 찍음
        transactions.forEach(tx => {
            // 차트 표시 범위(5분)를 벗어난 너무 오래된 데이터는 무시 (최적화)
            if (tx.timestamp < startTime) return;

            // X좌표: 흐른 시간에 비례하게 화면 넓이로 환산하되 축 레이블 여백(35px)을 고려
            const chartWidth = width - 35;
            const x = 35 + CoordinateMath.calculateX(tx.timestamp - startTime, TIME_WINDOW_MS, chartWidth);

            // Y좌표: 화면 하단 축 텍스트 여백(20px) 위부터 최상단까지 환산 (0 ~ height-20)
            const chartHeight = height - 20;
            const y = chartHeight - (chartHeight * Math.min(tx.responseTimeMs, Y_MAX_MS) / Y_MAX_MS);

            // X-View 표준 색상 기준 (에러면 빨강, 정상이면 스카이블루)
            const color = tx.isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(14, 165, 233, 0.7)'; // tailwind red-500, sky-500

            // 점 그리기 유틸리티 함수 호출
            ParticleRenderer.drawDot(ctx, x, y, color, tx.isError ? 3.5 : 2.5);

            // 루프 도중 현재 클릭된 트랜잭션(selectedTxId)을 발견했다면 따로 빼둠
            // (펄스 링 이펙트를 모든 점들 가장 위에 덮어씌워야 하므로 마지막에 그림)
            if (tx.id === selectedTxId) {
                selectedTx = tx;
                sx = x;
                sy = y;
            }
        });

        // 3. 대상이 있다면 네온 펄스 링 그리기
        if (selectedTx) {
            const color = selectedTx.isError ? 'rgba(239, 68, 68, 1)' : 'rgba(99, 102, 241, 1)'; // red-500 or indigo-500
            ParticleRenderer.drawPulseRing(ctx, sx, sy, time, color);
        }

    }, [selectedTxId]);

    const onHitTest = useCallback((x: number, y: number, width: number, height: number) => {
        const transactions = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;

        // Search backwards to match top visible (last drawn = topmost)
        for (let i = transactions.length - 1; i >= 0; i--) {
            const tx = transactions[i];
            if (tx.timestamp < startTime) continue;

            const chartWidth = width - 35;
            const chartHeight = height - 20;
            const px = 35 + CoordinateMath.calculateX(tx.timestamp - startTime, TIME_WINDOW_MS, chartWidth);
            const py = chartHeight - (chartHeight * Math.min(tx.responseTimeMs, Y_MAX_MS) / Y_MAX_MS);

            if (CoordinateMath.getDistance(px, py, x, y) < 8) { // 8px tolerance radius
                return tx;
            }
        }
        return null;
    }, []);

    const onClick = useCallback((hitTx: any | null) => {
        if (hitTx && hitTx.id) {
            loadDetail(hitTx.id);
        } else {
            closeDetail();
        }
    }, [loadDetail, closeDetail]);

    const { canvasRef } = useCanvasEngine({
        motionBlur: false, // Scatter chart doesn't need blur
        onDraw,
        onHitTest,
        onClick
    });

    return (
        <div className="w-full h-full bg-panel rounded-lg shadow-lg shadow-cyan-500/10 p-4 border border-border-main relative overflow-hidden flex flex-col transition-colors">
            <h3 className="text-main text-md font-semibold text-center z-10 pointers-events-none mb-2 select-none">X-View (Live Scatter)</h3>
            <div className="flex-1 relative w-full h-full">
                <canvas ref={canvasRef} className="w-full h-full block absolute top-0 left-0" />
            </div>

            {/* REST API Mock Overlay Layer */}
            {selectedTxId && (
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
                            <p><span className="text-gray-400 w-20 inline-block">TxID:</span> <span className="text-xs text-indigo-300 font-mono">{detailData.id}</span></p>
                            <p><span className="text-gray-400 w-20 inline-block">Time:</span> {new Date(detailData.timestamp).toLocaleTimeString()}</p>
                            <p className="flex"><span className="text-red-400 w-20 flex-shrink-0 font-semibold">Error:</span> <span className="text-red-300 break-words">{detailData.message}</span></p>
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-gray-400 mb-2">Stack Trace</p>
                                <pre className="text-xs text-gray-400 bg-gray-950 p-3 rounded overflow-x-auto max-w-sm border border-gray-800">
                                    {detailData.stackTrace}
                                </pre>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default XViewChart;
