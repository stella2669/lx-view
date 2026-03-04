import React from 'react';
import { useStore } from '../../store/useStore';
import { Cpu, MemoryStick, Timer, Activity, AlertTriangle } from 'lucide-react';
import BaseChartCard from '../shared/BaseChartCard';

const ProgressBar = ({ value, label }: { value: number, label: string }) => {
    const isHigh = value > 80;
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">{label}</span>
                <span className={isHigh ? "text-rose-400 font-bold" : "text-text-accent"}>{value.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-border-main rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 flex items-center justify-end ${isHigh ? 'bg-rose-500' : 'bg-text-accent'}`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                >
                    <div className="h-full w-2 bg-white opacity-30"></div>
                </div>
            </div>
        </div>
    );
};

const JvmMetrics: React.FC = () => {
    const jvmMetrics = useStore(state => state.jvmMetrics);

    if (!jvmMetrics) {
        return (
            <div className="h-full w-full bg-panel rounded-lg shadow-lg border border-border-main flex items-center justify-center p-4">
                <div className="animate-pulse text-muted">Waiting for JMX Telemetry...</div>
            </div>
        );
    }

    const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(0);

    return (
        <BaseChartCard title="JVM Resources (Server)" icon={Activity} iconColor="text-emerald-400">
            <div className="h-full flex flex-col justify-between overflow-hidden pr-2 py-1">
                {/* CPU */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted font-medium">
                        <Cpu size={14} /> PROCESS & SYSTEM CPU
                    </div>
                    <ProgressBar value={jvmMetrics.processCpuLoad * 100} label="Process CPU" />
                    <ProgressBar value={jvmMetrics.systemCpuLoad * 100} label="System CPU" />
                </div>

                {/* Memory */}
                <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs text-muted font-medium">
                        <span className="flex items-center gap-2"><MemoryStick size={14} /> HEAP MEMORY</span>
                        <span className="text-main">{formatMB(jvmMetrics.heapUsed)} / {formatMB(jvmMetrics.heapMax)} MB</span>
                    </div>
                    <ProgressBar value={jvmMetrics.heapUsagePercent} label="Heap Usage" />
                </div>

                {/* GC & Threads (Grid 2-cols) */}
                <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-border-main">
                    <div className="bg-panel-header/50 p-2 px-3 rounded-lg border border-border-main">
                        <div className="text-[10px] text-muted mb-1 flex items-center gap-1 font-semibold tracking-wider">
                            <Timer size={12} className="text-purple-400" /> GC ACTIVITY
                        </div>
                        <div className="mt-1">
                            <div className="text-sm flex justify-between">
                                <span className="text-muted text-xs">Count</span>
                                <span className="text-text-accent font-bold">{jvmMetrics.gcCount}</span>
                            </div>
                            <div className="text-sm flex justify-between mt-0.5">
                                <span className="text-muted text-xs">Time</span>
                                <span><span className="text-purple-400 font-bold">{jvmMetrics.gcTimeMs}</span><span className="text-[10px] text-muted ml-0.5">ms</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-panel-header/50 p-2 px-3 rounded-lg border border-border-main">
                        <div className="text-[10px] text-muted mb-1 flex items-center gap-1 font-semibold tracking-wider">
                            <Activity size={12} className={jvmMetrics.deadlockedThreads > 0 ? "text-rose-500" : "text-emerald-400"} /> THREADS
                        </div>
                        <div className="mt-1">
                            <div className="text-sm flex justify-between">
                                <span className="text-muted text-xs">Live</span>
                                <span className="text-emerald-400 font-bold">{jvmMetrics.liveThreads}</span>
                            </div>
                            <div className="text-sm flex justify-between items-center mt-0.5">
                                <span className="text-muted text-xs">Deadlock</span>
                                <span className={jvmMetrics.deadlockedThreads > 0 ? "text-rose-500 font-bold flex items-center gap-1" : "text-muted font-bold"}>
                                    {jvmMetrics.deadlockedThreads > 0 && <AlertTriangle size={12} />}
                                    {jvmMetrics.deadlockedThreads}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseChartCard>
    );
};

export default JvmMetrics;
