import React from 'react';
import { LayoutDashboard } from 'lucide-react';

const WidgetSelector: React.FC = () => {
  return (
    <div className="flex items-center justify-between bg-panel border-b border-border-main p-4 shadow-sm mb-4 rounded-t-lg">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="text-cyan-400" />
        <h2 className="text-lg font-bold">Custom Dashboard</h2>
      </div>
    </div>
  );
};

export default WidgetSelector;
