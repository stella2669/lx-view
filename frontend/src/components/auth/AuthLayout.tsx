import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 animate-fade-in-down">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            LX-VIEW
          </h1>
          <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>

        <div className="bg-[#1e2330]/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8 animate-scale-up">
          {children}
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">
          &copy; 2026 Antigravity Team. All rights reserved.
        </div>
      </div>
    </div>
  );
};
