import React, { useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { CoordinateMath } from '../../core/math/CoordinateMath';
import { ParticleRenderer } from '../../core/renderer/ParticleRenderer';
import { useTransactionDetail } from '../../hooks/useTransactionDetail';
import { ScatterChart } from 'lucide-react';
import BaseChartCard from '../shared/BaseChartCard';

// 분리된 모듈형 UI 컴포넌트 임포트
import XViewTransactionDetail from './XViewTransactionDetail';
import XViewSelectionList from './XViewSelectionList';

const TIME_WINDOW_MS = 5 * 60 * 1000;
const MIN_Y_MAX_MS = 5000;
const BUCKET_SIZE_MS = 10000;
const BUCKET_COUNT = TIME_WINDOW_MS / BUCKET_SIZE_MS;

const XViewChart: React.FC = () => {
    const { selectedTxId, loadDetail, closeDetail, detailData, loading, error } = useTransactionDetail();

    // [버그 수정] 컨테이너 기반 좌표 제어를 위한 Ref
    const containerRef = useRef<HTMLDivElement>(null);

    // [기능 1, 2, 3] 팝업 이동 / 드래그 영역 해제 / ESC 상태 관리
    const [dragBox, setDragBox] = React.useState<{ 
        startTime: number; endTime: number; startRT: number; endRT: number; isDragging: boolean;
    } | null>(null);
    const dragBoxRef = useRef<{ startTime: number; endTime: number; startRT: number; endRT: number; isDragging: boolean } | null>(null);
    const [selectedTransactions, setSelectedTransactions] = React.useState<any[]>([]);
    const [listSize, setListSize] = React.useState({ width: 320, height: 400 });
    const [detailSize, setDetailSize] = React.useState({ width: 450, height: 500 });

    // [기능 1] 팝업 위치 state (기본값은 0, 0이지만 마운트 후 계산)
    const [listPos, setListPos] = React.useState({ x: 0, y: 0 });
    const [detailPos, setDetailPos] = React.useState({ x: 0, y: 0 });
    const [posInited, setPosInited] = React.useState(false);

    // 리사이즈 / 이동 작업 타입 구분
    const [resizingType, setResizingType] = React.useState<'list' | 'detail' | null>(null);
    const [movingType, setMovingType] = React.useState<'list' | 'detail' | null>(null);

    const stylesCacheRef = useRef<any>(null);
    const lastThemeRef = useRef<string | null>(null);
    const chartHeightRef = useRef<number>(5000);
    const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
    const moveStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

    // 포털(createPortal) 기반 fixed 팝업의 초기 위치 계산 (뷰포트 좌표)
    useEffect(() => {
        if (!posInited && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // 리스트는 차트 우측 상단 근처
            setListPos({ x: rect.right - 340, y: rect.top + 50 });
            // 디테일은 차트 중앙 상단 근처
            setDetailPos({ x: rect.left + Math.max(0, rect.width / 2 - 225), y: rect.top + 50 });
            setPosInited(true);
        }
    }, [posInited]);

    // [성능 개선] Y축 최대값 계산 최적화
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

    const onResizeStart = useCallback((type: 'list' | 'detail', e: React.MouseEvent) => {
        e.preventDefault();
        setResizingType(type);
        const currentSize = type === 'list' ? listSize : detailSize;
        resizeStartRef.current = {
            x: e.clientX, y: e.clientY, w: currentSize.width, h: currentSize.height
        };
    }, [listSize, detailSize]);

    const onMoveStart = useCallback((type: 'list' | 'detail', e: React.MouseEvent) => {
        e.preventDefault();
        const currentPos = type === 'list' ? listPos : detailPos;
        moveStartRef.current = { mx: e.clientX, my: e.clientY, px: currentPos.x, py: currentPos.y };
        setMovingType(type);
    }, [listPos, detailPos]);

    useEffect(() => {
        if (!resizingType) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;
            const deltaX = resizingType === 'list' ? resizeStartRef.current.x - e.clientX : e.clientX - resizeStartRef.current.x;
            const deltaY = e.clientY - resizeStartRef.current.y;
            const setter = resizingType === 'list' ? setListSize : setDetailSize;
            const minW = resizingType === 'list' ? 280 : 350;
            setter({
                width: Math.max(minW, resizeStartRef.current.w + deltaX),
                height: Math.max(200, resizeStartRef.current.h + deltaY)
            });
        };
        const handleMouseUp = () => { setResizingType(null); resizeStartRef.current = null; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingType]);

    useEffect(() => {
        if (!movingType) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!moveStartRef.current) return;
            const dx = e.clientX - moveStartRef.current.mx;
            const dy = e.clientY - moveStartRef.current.my;
            const newPos = {
                x: moveStartRef.current.px + dx,
                y: moveStartRef.current.py + dy,
            };
            if (movingType === 'list') setListPos(newPos);
            else setDetailPos(newPos);
        };
        const handleMouseUp = () => { setMovingType(null); moveStartRef.current = null; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [movingType]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (selectedTxId) {
                closeDetail();
            } else if (selectedTransactions.length > 0) {
                setSelectedTransactions([]);
                setDragBox(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTxId, selectedTransactions.length, closeDetail]);

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

    const onDraw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
        const styles = getCachedStyles();
        const transactions = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;
        const yMax = getYMax(transactions, now);
        chartHeightRef.current = yMax;

        const chartWidth = width - 35;
        const chartHeight = height - 20;
        const widthRatio = chartWidth / TIME_WINDOW_MS;
        const heightRatio = chartHeight / yMax;

        // 1. Grid & Axes
        ctx.strokeStyle = styles.gridColor;
        ctx.fillStyle = styles.textColor;
        ctx.font = '10px Inter';
        ctx.setLineDash([5, 5]);
        ctx.textAlign = 'right';
        const step = yMax > 15000 ? 5000 : 2500;
        ctx.beginPath();
        for (let v = step; v < yMax; v += step) {
            const y = chartHeight - (v * heightRatio);
            ctx.moveTo(35, y); ctx.lineTo(width, y);
            ctx.fillText(`${(v / 1000).toFixed(1)}s`, 30, y + 4);
        }
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.beginPath();
        const firstM = Math.ceil(startTime / 60000) * 60000;
        for (let t = firstM; t <= now; t += 60000) {
            const x = 35 + (t - startTime) * widthRatio;
            ctx.moveTo(x, 0); ctx.lineTo(x, chartHeight);
            ctx.fillText(new Date(t).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }), x, height - 5);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = styles.axisTitleColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(35, 0); ctx.lineTo(35, chartHeight); ctx.lineTo(width, chartHeight);
        ctx.stroke();

        // 2. Transactions
        let selectedTxObj: any = null;
        ctx.fillStyle = 'rgba(14, 165, 233, 0.7)'; ctx.beginPath();
        for (const tx of transactions) {
            if (tx.timestamp < startTime || tx.isError) continue;
            const x = 35 + (tx.timestamp - startTime) * widthRatio;
            const y = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);
            ctx.moveTo(x + 2.5, y); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            if (tx.id === selectedTxId) selectedTxObj = tx;
        }
        ctx.fill();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; ctx.beginPath();
        for (const tx of transactions) {
            if (tx.timestamp < startTime || !tx.isError) continue;
            const x = 35 + (tx.timestamp - startTime) * widthRatio;
            const y = chartHeight - (Math.min(tx.responseTimeMs, yMax) * heightRatio);
            ctx.moveTo(x + 3.5, y); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            if (tx.id === selectedTxId) selectedTxObj = tx;
        }
        ctx.fill();

        if (selectedTxObj) {
            const x = 35 + (selectedTxObj.timestamp - startTime) * widthRatio;
            const y = chartHeight - (Math.min(selectedTxObj.responseTimeMs, yMax) * heightRatio);
            ParticleRenderer.drawPulseRing(ctx, x, y, time, selectedTxObj.isError ? 'rgba(239, 68, 68, 1)' : 'rgba(99, 102, 241, 1)');
        }

        if (dragBox) {
            const x1 = 35 + (dragBox.startTime - startTime) * widthRatio;
            const x2 = 35 + (dragBox.endTime - startTime) * widthRatio;
            const y1 = chartHeight - (dragBox.startRT * heightRatio);
            const y2 = chartHeight - (dragBox.endRT * heightRatio);
            const bx = Math.min(x1, x2), by = Math.min(y1, y2), bw = Math.abs(x2 - x1), bh = Math.abs(y2 - y1);
            if (bx + bw >= 35 && bx <= width) {
                ctx.fillStyle = dragBox.isDragging ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.25)';
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; ctx.strokeRect(bx, by, bw, bh);
            }
        }
    }, [selectedTxId, dragBox, selectedTransactions, getCachedStyles, getYMax]);

    const onHitTest = useCallback((hx: number, hy: number, width: number, height: number) => {
        const txs = useStore.getState().transactions;
        const now = Date.now();
        const startTime = now - TIME_WINDOW_MS;
        const yMax = getYMax(txs, now);
        const wRatio = (width - 35) / TIME_WINDOW_MS;
        const hRatio = (height - 20) / yMax;

        for (let i = txs.length - 1; i >= 0; i--) {
            const tx = txs[i];
            if (tx.timestamp < startTime) continue;
            const px = 35 + (tx.timestamp - startTime) * wRatio;
            const py = (height - 20) - (Math.min(tx.responseTimeMs, yMax) * hRatio);
            if (CoordinateMath.getDistance(px, py, hx, hy) < 10) return tx;
        }
        return null;
    }, [getYMax]);

    const onClick = useCallback((hit: any | null) => {
        if (hit && hit.id) {
            loadDetail(hit.id);
            setSelectedTransactions([]);
        } else {
            closeDetail();
            setSelectedTransactions([]);
            setDragBox(null);
        }
    }, [loadDetail, closeDetail]);

    const onDragStart = useCallback((x: number, y: number) => {
        closeDetail();
        // 드래그 시작 시 기존 선택 목록을 즉시 리셋하여 불필요한 데이터가 노출되지 않도록 함
        setSelectedTransactions([]);
        
        const cw = (canvasRef.current?.width || 0) / (window.devicePixelRatio || 1) - 35;
        const ch = (canvasRef.current?.height || 0) / (window.devicePixelRatio || 1) - 20;
        const st = CoordinateMath.calculateTimestampFromX(x - 35, cw, Date.now(), TIME_WINDOW_MS);
        const sr = CoordinateMath.calculateRTFromY(y, ch, chartHeightRef.current);
        
        const initBox = { startTime: st, endTime: st, startRT: sr, endRT: sr, isDragging: true };
        dragBoxRef.current = initBox;
        setDragBox(initBox);
    }, [closeDetail]);

    const onDrag = useCallback((_sx: number, _sy: number, cx: number, cy: number) => {
        if (!dragBoxRef.current) return;
        const cw = (canvasRef.current?.width || 0) / (window.devicePixelRatio || 1) - 35;
        const ch = (canvasRef.current?.height || 0) / (window.devicePixelRatio || 1) - 20;
        const ct = CoordinateMath.calculateTimestampFromX(cx - 35, cw, Date.now(), TIME_WINDOW_MS);
        const cr = CoordinateMath.calculateRTFromY(cy, ch, chartHeightRef.current);
        
        const newBox = { ...dragBoxRef.current, endTime: ct, endRT: cr, isDragging: true };
        dragBoxRef.current = newBox;
        setDragBox(newBox);
    }, []);

    const onDragEnd = useCallback(() => {
        if (!dragBoxRef.current) return;
        const p = dragBoxRef.current;
        const txs = useStore.getState().transactions;
        const tMin = Math.min(p.startTime, p.endTime), tMax = Math.max(p.startTime, p.endTime);
        const rMin = Math.min(p.startRT, p.endRT), rMax = Math.max(p.startRT, p.endRT);
        const sel = txs.filter(tx => tx.timestamp >= tMin && tx.timestamp <= tMax && tx.responseTimeMs >= rMin && tx.responseTimeMs <= rMax).slice(-50);
        
        // 새로 드래그한 결과(sel)로 완전히 덮어쓰기
        setSelectedTransactions(sel);
        
        const finalBox = { ...p, isDragging: false };
        dragBoxRef.current = finalBox;
        setDragBox(finalBox);
    }, []);

    const { canvasRef } = useCanvasEngine({ motionBlur: false, onDraw, onHitTest, onClick, onDragStart, onDrag, onDragEnd });

    return (
        <BaseChartCard title="X-View (Live Scatter)" icon={ScatterChart} iconColor="text-indigo-400">
            {/* 캔버스 컨테이너 — 포털로 렌더링되는 팝업과 독립적 */}
            <div ref={containerRef} className="absolute inset-0 block w-full h-full overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            {/* 트랜잭션 상세 팝업 — createPortal로 document.body에 렌더링 */}
            {selectedTxId && (
                <XViewTransactionDetail
                    detailData={detailData} loading={loading} error={error} size={detailSize} pos={detailPos}
                    onClose={closeDetail}
                    onResizeStart={(e) => onResizeStart('detail', e)}
                    onMoveStart={(e) => onMoveStart('detail', e)}
                />
            )}

            {/* 선택 트랜잭션 목록 팝업 — createPortal로 document.body에 렌더링 */}
            <XViewSelectionList
                transactions={selectedTransactions} size={listSize} pos={listPos}
                onClose={() => { setSelectedTransactions([]); setDragBox(null); }}
                onSelectTransaction={loadDetail}
                onResizeStart={(e) => onResizeStart('list', e)}
                onMoveStart={(e) => onMoveStart('list', e)}
            />
        </BaseChartCard>
    );
};

export default XViewChart;
