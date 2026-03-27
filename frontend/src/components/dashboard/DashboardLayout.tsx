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
import { KpiActiveService, KpiTotalRequest, KpiTotalError, KpiTps, KpiJvmThread } from '../monitor/TopStatsPanels';

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
  KpiActiveService,
  KpiTotalRequest,
  KpiTotalError,
  KpiTps,
  KpiJvmThread
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
        breakpoints={{ lg: 0 }}
        cols={{ lg: 48 }}
        rowHeight={25}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".dashboard-drag-handle"
        margin={[8, 8]}
        containerPadding={[0, 0]}
      >
        {panels.map((panel: DashboardPanel) => {
          const Component = PanelComponents[panel.type];

          // React-grid-layout의 완벽한 자동 반응형(Responsive) 처리를 위해
          // 개별 아이템에 억지로 data-grid를 주입하지 않고 layouts 프롭스에 완전히 위임합니다.
          return (
            <div key={panel.id} className="h-full w-full">
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
