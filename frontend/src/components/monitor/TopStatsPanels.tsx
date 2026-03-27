import React from 'react';
import { useStore } from '../../store/useStore';
import { Activity, Globe, AlertTriangle, Zap, Server } from 'lucide-react';

const KpiCardWrapper: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    border: string;
    text: string;
}> = ({ label, value, icon, color, border, text }) => (
    <div className={`h-full w-full relative overflow-hidden bg-gradient-to-br ${color} border ${border} rounded-xl p-3 lg:p-4 flex flex-col justify-center shadow-lg backdrop-blur-sm`}>
        <div className="flex justify-between items-start mb-1 lg:mb-2 relative z-10 w-full">
            <h3 className="text-muted text-xs lg:text-sm font-medium tracking-wide truncate pr-1">{label}</h3>
            <div className={`p-1.5 rounded-lg bg-panel/50 backdrop-blur-md shrink-0`}>
                {icon}
            </div>
        </div>
        <div className="flex items-baseline space-x-2 relative z-10">
            <span className={`text-2xl lg:text-3xl font-bold tracking-tight ${text} truncate`}>
                {value}
            </span>
        </div>
        <div className={`absolute -bottom-6 -right-6 w-16 lg:w-20 h-16 lg:h-20 rounded-full bg-gradient-to-br ${color} blur-2xl opacity-50`}></div>
    </div>
);

export const KpiActiveService: React.FC = () => {
    const stats = useStore(state => state.topStats);
    const active = stats?.active || 0;
    return <KpiCardWrapper label="Active Services" value={active} icon={<Activity className="w-4 h-4 text-cyan-400" />} color="from-cyan-500/20 to-cyan-900/20" border="border-cyan-500/30" text="text-cyan-400" />;
};

export const KpiTotalRequest: React.FC = () => {
    const stats = useStore(state => state.topStats);
    const requests = stats?.requests || 0;
    return <KpiCardWrapper label="Total Requests" value={requests.toLocaleString()} icon={<Globe className="w-4 h-4 text-blue-400" />} color="from-blue-500/20 to-blue-900/20" border="border-blue-500/30" text="text-blue-400" />;
};

export const KpiTotalError: React.FC = () => {
    const stats = useStore(state => state.topStats);
    const errors = stats?.errors || 0;
    return <KpiCardWrapper label="Total Errors" value={errors.toLocaleString()} icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} color="from-rose-500/20 to-rose-900/20" border="border-rose-500/30" text="text-rose-400" />;
};

export const KpiTps: React.FC = () => {
    const stats = useStore(state => state.topStats);
    const tps = stats?.tps || 0;
    return <KpiCardWrapper label="TPS (Trx/s)" value={tps} icon={<Zap className="w-4 h-4 text-amber-400" />} color="from-amber-500/20 to-amber-900/20" border="border-amber-500/30" text="text-amber-400" />;
};

export const KpiJvmThread: React.FC = () => {
    const stats = useStore(state => state.topStats);
    const threads = stats?.threads || 0;
    return <KpiCardWrapper label="JVM Threads" value={threads} icon={<Server className="w-4 h-4 text-emerald-400" />} color="from-emerald-500/20 to-emerald-900/20" border="border-emerald-500/30" text="text-emerald-400" />;
};
