import React, { useCallback } from 'react';
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
    const { selectedTxId, loadDetail, closeDetail, detailData, loading } = useTransactionDetail();

    // 상태 요약: 드래그 박스, 선택된 트랜잭션들, 각 팝업 사이즈
    const [dragBox, setDragBox] = React.useState<{ 
        startTime: number; endTime: number; startRT: number; endRT: number; isDragging: boolean;
    } | null>(null);
    const [selectedTransactions, setSelectedTransactions] = React.useState<any[]>([]);
    const [listSize, setListSize] = React.useState({ width: 320, height: 400 });
    const [detailSize, setDetailSize] = React.useState({ width: 450, height: 500 });
    const [resizingType, setResizingType] = React.useState<'list' | 'detail' | null>(null);

    const stylesCacheRef = React.useRef<any>(null);
    const lastThemeRef = React.useRef<string | null>(null);
    const chartHeightRef = React.useRef<number>(5000);
    const resizeStartRef = React.useRef<{ x: number; y: number; w: number; h: number } | null>(null);

    // [성능 개선] Y축 최대값 계산 최적화: 매 프레임 호출되므로 Int32Array 기반 고속 연산 유지
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

    // [성능 개선] 리사이즈 핸들러는 useCallback으로 고정
    const onResizeStart = useCallback((type: 'list' | 'detail', e: React.MouseEvent) => {
        e.preventDefault();
        setResizingType(type);
        const currentSize = type === 'list' ? listSize : detailSize;
        resizeStartRef.current = {
            x: e.clientX, y: e.clientY, w: currentSize.width, h: currentSize.height
        };
    }, [listSize, detailSize]);

    React.useEffect(() => {
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

        // 2. Transactions (Batched Rendering)
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

        // 3. Effects & Dynamic Selection Box
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
        if (hit && hit.id) { loadDetail(hit.id); setSelectedTransactions([]); } 
        else { closeDetail(); setSelectedTransactions([]); }
    }, [loadDetail, closeDetail]);

    const onDragStart = useCallback((x: number, y: number) => {
        closeDetail();
        const cw = (canvasRef.current?.width || 0) / (window.devicePixelRatio || 1) - 35;
        const ch = (canvasRef.current?.height || 0) / (window.devicePixelRatio || 1) - 20;
        const st = CoordinateMath.calculateTimestampFromX(x - 35, cw, Date.now(), TIME_WINDOW_MS);
        const sr = CoordinateMath.calculateRTFromY(y, ch, chartHeightRef.current);
        setDragBox({ startTime: st, endTime: st, startRT: sr, endRT: sr, isDragging: true });
    }, [closeDetail]);

    const onDrag = useCallback((_sx: number, _sy: number, cx: number, cy: number) => {
        const cw = (canvasRef.current?.width || 0) / (window.devicePixelRatio || 1) - 35;
        const ch = (canvasRef.current?.height || 0) / (window.devicePixelRatio || 1) - 20;
        const ct = CoordinateMath.calculateTimestampFromX(cx - 35, cw, Date.now(), TIME_WINDOW_MS);
        const cr = CoordinateMath.calculateRTFromY(cy, ch, chartHeightRef.current);
        setDragBox(p => p ? { ...p, endTime: ct, endRT: cr } : null);
    }, []);

    const onDragEnd = useCallback(() => {
        setDragBox(p => {
            if (!p) return null;
            const txs = useStore.getState().transactions;
            const tMin = Math.min(p.startTime, p.endTime), tMax = Math.max(p.startTime, p.endTime);
            const rMin = Math.min(p.startRT, p.endRT), rMax = Math.max(p.startRT, p.endRT);
            const sel = txs.filter(tx => tx.timestamp >= tMin && tx.timestamp <= tMax && tx.responseTimeMs >= rMin && tx.responseTimeMs <= rMax).slice(-50);
            setSelectedTransactions(sel);
            return { ...p, isDragging: false };
        });
    }, []);

    const { canvasRef } = useCanvasEngine({ motionBlur: false, onDraw, onHitTest, onClick, onDragStart, onDrag, onDragEnd });

    return (
        <BaseChartCard title="X-View (Live Scatter)" icon={ScatterChart} iconColor="text-indigo-400">
            <canvas ref={canvasRef} className="w-full h-full block absolute top-0 left-0" />

            {/* 분리된 상세 정보 팝업 컴포넌트 */}
            {selectedTxId && (
                <XViewTransactionDetail 
                    detailData={detailData} loading={loading} size={detailSize} 
                    onClose={closeDetail} onResizeStart={(e) => onResizeStart('detail', e)} 
                />
            )}

            {/* 분리된 선택 목록 팝업 컴포넌트 */}
            <XViewSelectionList 
                transactions={selectedTransactions} size={listSize} 
                onClose={() => setSelectedTransactions([])} onSelectTransaction={loadDetail} 
                onResizeStart={(e) => onResizeStart('list', e)} 
            />
        </BaseChartCard>
    );
};

export default XViewChart;
