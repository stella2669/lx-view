import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { PanelType, DashboardPanel } from '../../store/useDashboardStore';

// 차트 컴포넌트들 Map
import XViewChart from '../monitor/XViewChart';
import ActiveServiceChart from '../monitor/ActiveServiceChart';
import TransactionFlow from '../monitor/TransactionFlow';
import ResponseStats from '../monitor/ResponseStats';
import { UnifiedErrorList } from '../monitor/UnifiedErrorList';

import DashboardPanelWrapper from './DashboardPanelWrapper';
import JvmMetrics from '../monitor/JvmMetrics';
import SqlMonitorPanel from '../monitor/SqlMonitorPanel';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PanelComponents: Record<PanelType, React.FC<any>> = {
  TransactionFlow,
  ResponseStats,
  XViewChart,
  ActiveServiceChart,
  JvmMetrics,
  SqlMonitorPanel,
  UnifiedErrorList,
};

const DashboardLayout: React.FC = () => {
  const { panels, layouts, updateLayouts, isEditMode, removePanel } = useDashboardStore();

  const handleLayoutChange = (_currentLayout: Layout[], allLayouts: Record<string, Layout[]>) => {
    updateLayouts(allLayouts);
  };

  return (
    <div className={`w-full h-full relative min-h-[500px] transition-colors duration-500 rounded-xl ${isEditMode ? 'bg-base edit-grid-bg border border-dashed border-cyan-500/30' : ''}`}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".dashboard-drag-handle"
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {panels.map((panel: DashboardPanel) => {
          const Component = PanelComponents[panel.type];

          const defaultLayoutItem = { x: 0, y: Infinity, w: 4, h: 4, minW: 3, minH: 3 };
          const layoutItem = layouts.lg?.find(l => l.i === panel.id)
            || layouts.md?.find(l => l.i === panel.id)
            || layouts.sm?.find(l => l.i === panel.id)
            || defaultLayoutItem;

          return (
            <div key={panel.id} data-grid={layoutItem} className="h-full w-full">
              <DashboardPanelWrapper
                panelId={panel.id}
                isEditMode={isEditMode}
                onRemove={removePanel}
              >
                <Component />
              </DashboardPanelWrapper>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* 빈 대시보드일 때 메시지 */}
      {panels.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted gap-4">
          <p className="text-xl font-medium">대시보드에 표시할 모니터링 패널이 없습니다.</p>
          <p>모니터링 항목 리스트에서 원하는 차트를 추가해주세요.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
