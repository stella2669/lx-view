import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { ThemeSelector } from './components/shared/ThemeSelector';
import { LayoutDropdown } from './components/shared/LayoutDropdown';
import TopStats from './components/monitor/TopStats';
import DashboardLayout from './components/dashboard/DashboardLayout';

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
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <LayoutDropdown />
          </div>
        </div>
      </header>

      <TopStats />

      <main className="flex flex-col gap-4 pb-12 mt-6">
        <div className="min-h-[700px]">
          <DashboardLayout />
        </div>
      </main>
    </div>
  );
};

export default App;
