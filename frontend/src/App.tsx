import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { ThemeSelector } from './components/shared/ThemeSelector';
import { LayoutDropdown } from './components/shared/LayoutDropdown';
import DashboardLayout from './components/dashboard/DashboardLayout';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { useAuthStore } from './store/useAuthStore';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import SettingsModal from './components/admin/SettingsModal';

const App: React.FC = () => {
  const { isAuthenticated, username, logout } = useAuthStore();
  const [activePage, setActivePage] = useState<'login' | 'signup'>('login');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Start WebSocket Hook
  useWebSocket();

  if (!isAuthenticated) {
    return activePage === 'login' 
      ? <LoginPage onSwitchToSignup={() => setActivePage('signup')} />
      : <SignupPage onSwitchToLogin={() => setActivePage('login')} />;
  }

  return (
    <div className="min-h-screen bg-base text-main font-sans p-6 selection:bg-cyan-500/30">
      <header className="mb-6 flex items-center justify-between border-b border-border-main pb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              LX-VIEW
            </h1>
            <p className="text-muted mt-1 text-xs">Real-time Application Performance Monitoring</p>
          </div>
          <div className="h-10 w-[1px] bg-border-main hidden md:block"></div>
          <div className="hidden md:flex items-center gap-2 bg-panel px-3 py-1.5 rounded-full border border-border-main">
            <UserIcon size={14} className="text-cyan-400" />
            <span className="text-xs font-semibold">{username}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* First Row: Status, Apps, Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></span>
              Live
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-panel-header hover:bg-hover text-text-main px-3 py-1.5 rounded-lg border border-border-main transition-all text-xs font-bold"
                title="System Settings"
              >
                <Settings size={14} className="text-text-accent" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button 
                onClick={logout}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all text-xs font-bold"
                title="Logout"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Second Row: Theme & Layout */}
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <LayoutDropdown />
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-4 pb-12 mt-6">
        <div className="min-h-[700px]">
          <DashboardLayout />
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default App;
