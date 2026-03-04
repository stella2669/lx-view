import React from 'react';
import XViewChart from './components/monitor/XViewChart';
import ActiveServiceChart from './components/monitor/ActiveServiceChart';
import TransactionFlow from './components/monitor/TransactionFlow';
import ResponseStats from './components/monitor/ResponseStats';
import TopStats from './components/monitor/TopStats';
import JvmMetrics from './components/monitor/JvmMetrics';
import { useWebSocket } from './hooks/useWebSocket';

import SqlMonitorPanel from './components/monitor/SqlMonitorPanel';
import { UnifiedErrorList } from './components/monitor/UnifiedErrorList';
import { Database, AlertCircle } from 'lucide-react';
import { ThemeSelector } from './components/shared/ThemeSelector';

const App: React.FC = () => {
  // Start WebSocket Hook
  useWebSocket();

  return (
    <div className="min-h-screen bg-base text-main font-sans p-6 selection:bg-cyan-500/30">
      <header className="mb-6 flex items-center justify-between border-b border-border-main pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            APM Dashboard
          </h1>
          <p className="text-muted mt-1">Real-time Application Performance Monitoring</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
            Live Connection
          </div>
          <ThemeSelector />
        </div>
      </header>

      <TopStats />

      <main className="flex flex-col gap-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[700px]">
          {/* Left Column (Main Charts) */}
          <div className="lg:col-span-3 h-full flex flex-col gap-6">
            <div className="h-48 shrink-0 flex gap-6">
              <div className="flex-[2] bg-panel rounded-lg shadow-lg border border-border-main shrink-0 flex flex-col pt-2 relative overflow-hidden">
                <TransactionFlow />
              </div>
              <div className="flex-1 h-full">
                <ResponseStats />
              </div>
            </div>
            <div className="flex-1 min-h-[400px]">
              <XViewChart />
            </div>
          </div>

          {/* Right Column (Side Panels) */}
          <div className="lg:col-span-1 h-full flex flex-col gap-6">
            <div className="flex-1 min-h-[250px]">
              <ActiveServiceChart />
            </div>
            <div className="flex-1 min-h-[300px]">
              <JvmMetrics />
            </div>
          </div>
        </div>

        {/* System Error Logs & Database Monitoring Section (Bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 pt-6 border-t border-border-main min-h-[500px]">

          <section className="lg:col-span-1 flex flex-col h-full">
            <h2 className="text-xl font-bold tracking-tight text-main mb-4 flex items-center gap-2">
              <AlertCircle className="text-rose-500" /> System Errors
            </h2>
            <UnifiedErrorList />
          </section>

          <section className="lg:col-span-2 flex flex-col h-full">
            <h2 className="text-xl font-bold tracking-tight text-main mb-4 flex items-center gap-2">
              <Database className="text-blue-400" /> Database & SQL Monitoring
            </h2>
            <SqlMonitorPanel />
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;
