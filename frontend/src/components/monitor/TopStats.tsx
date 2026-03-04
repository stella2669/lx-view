import React from 'react';
import { useStore } from '../../store/useStore';
import { Activity, Globe, AlertTriangle, Zap, Server } from 'lucide-react';


const TopStats: React.FC = () => {
    const topStats = useStore((state) => state.topStats);

    // default zero values before the first websocket message arrives
    const stats = topStats || {
        active: 0,
        requests: 0,
        errors: 0,
        tps: 0,
        threads: 0,
    };

    const statCards = [
        {
            label: 'Active Services',
            value: stats.active,
            icon: <Activity className="w-5 h-5 text-cyan-400" />,
            color: 'from-cyan-500/20 to-cyan-900/20',
            border: 'border-cyan-500/30',
            text: 'text-cyan-400'
        },
        {
            label: 'Total Requests',
            value: stats.requests.toLocaleString(),
            icon: <Globe className="w-5 h-5 text-blue-400" />,
            color: 'from-blue-500/20 to-blue-900/20',
            border: 'border-blue-500/30',
            text: 'text-blue-400'
        },
        {
            label: 'Total Errors',
            value: stats.errors.toLocaleString(),
            icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
            color: 'from-rose-500/20 to-rose-900/20',
            border: 'border-rose-500/30',
            text: 'text-rose-400'
        },
        {
            label: 'TPS (Transactions/s)',
            value: stats.tps,
            icon: <Zap className="w-5 h-5 text-amber-400" />,
            color: 'from-amber-500/20 to-amber-900/20',
            border: 'border-amber-500/30',
            text: 'text-amber-400'
        },
        {
            label: 'JVM Threads',
            value: stats.threads,
            icon: <Server className="w-5 h-5 text-emerald-400" />,
            color: 'from-emerald-500/20 to-emerald-900/20',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {statCards.map((stat, idx) => (
                <div key={idx} className={`relative overflow-hidden bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h3 className="text-muted text-sm font-medium tracking-wide">{stat.label}</h3>
                        <div className={`p-2 rounded-lg bg-panel/50 backdrop-blur-md`}>
                            {stat.icon}
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2 relative z-10">
                        <span className={`text-3xl font-bold tracking-tight ${stat.text}`}>
                            {stat.value}
                        </span>
                    </div>
                    <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} blur-2xl opacity-50`}></div>
                </div>
            ))}
        </div>
    );
};

export default TopStats;
