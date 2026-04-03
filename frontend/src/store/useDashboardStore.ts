import { create } from 'zustand';
import type { Layout } from 'react-grid-layout';
import { useAuthStore } from './useAuthStore';
import { apiFetch } from '../utils/api';

export type PanelType = string;

export interface WidgetInfo {
  id: number;
  widgetType: string;
  label: string;
  description: string;
  isActive: boolean;
  minW: number;
  minH: number;
}

export interface TopStatsVisibility {
  activeServices: boolean;
  totalRequests: boolean;
  totalErrors: boolean;
  tps: boolean;
  jvmThreads: boolean;
}

export interface DashboardPanel {
  id: string;
  type: PanelType;
}

interface DashboardState {
  panels: DashboardPanel[];
  availableWidgets: WidgetInfo[];
  layouts: Record<string, Layout[]>;
  isEditMode: boolean;
  topStatsVisibility: TopStatsVisibility;
  addPanel: (type: PanelType) => void;
  removePanel: (id: string) => void;
  updateLayouts: (newLayouts: Record<string, Layout[]>) => void;
  toggleEditMode: () => void;
  setTopStatsVisibility: (visibility: Partial<TopStatsVisibility>) => void;
  fetchLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
  fetchAvailableWidgets: () => Promise<void>;
}

// 초기 기본 레이아웃 및 패널
const initialPanels: DashboardPanel[] = [
  { id: 'panel-kpi-active', type: 'KpiActiveService' },
  { id: 'panel-kpi-req', type: 'KpiTotalRequest' },
  { id: 'panel-kpi-err', type: 'KpiTotalError' },
  { id: 'panel-kpi-tps', type: 'KpiTps' },
  { id: 'panel-kpi-thread', type: 'KpiJvmThread' },
  { id: 'panel-txn-flow', type: 'TransactionFlow' },
  { id: 'panel-res-stats', type: 'ResponseStats' },
  { id: 'panel-xview', type: 'XViewChart' },
  { id: 'panel-active-svc', type: 'ActiveServiceChart' },
  { id: 'panel-jvm', type: 'JvmMetrics' },
  { id: 'panel-error', type: 'UnifiedErrorList' },
  { id: 'panel-sql', type: 'SqlMonitorPanel' },
];

const initialLayouts: Record<string, Layout[]> = {
  lg: [
    { i: 'panel-kpi-active', x: 0,  y: 0,  w: 8,  h: 4, minW: 4, minH: 4, maxH: 8 },
    { i: 'panel-kpi-req',    x: 8,  y: 0,  w: 12, h: 4, minW: 4, minH: 4, maxH: 8 },
    { i: 'panel-kpi-err',    x: 20, y: 0,  w: 12, h: 4, minW: 4, minH: 4, maxH: 8 },
    { i: 'panel-kpi-tps',    x: 32, y: 0,  w: 8,  h: 4, minW: 4, minH: 4, maxH: 8 },
    { i: 'panel-kpi-thread', x: 40, y: 0,  w: 8,  h: 4, minW: 4, minH: 4, maxH: 8 },
    { i: 'panel-txn-flow',   x: 0,  y: 4,  w: 32, h: 16, minW: 12, minH: 12 },
    { i: 'panel-res-stats',  x: 32, y: 4,  w: 16, h: 16, minW: 12, minH: 12 },
    { i: 'panel-xview',      x: 0,  y: 20, w: 32, h: 24, minW: 16, minH: 16 },
    { i: 'panel-active-svc', x: 32, y: 20, w: 16, h: 16, minW: 12, minH: 12 },
    { i: 'panel-jvm',        x: 32, y: 36, w: 16, h: 16, minW: 12, minH: 12 },
    { i: 'panel-error',      x: 0,  y: 44, w: 16, h: 24, minW: 12, minH: 12 },
    { i: 'panel-sql',        x: 16, y: 44, w: 32, h: 24, minW: 16, minH: 12 },
  ]
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  panels: initialPanels,
  availableWidgets: [],
  layouts: initialLayouts,
  isEditMode: false,
  topStatsVisibility: {
    activeServices: true,
    totalRequests: true,
    totalErrors: true,
    tps: true,
    jvmThreads: true,
  },

  addPanel: (type) => {
    const id = `panel-${Date.now()}`;
    const newPanel: DashboardPanel = { id, type };

    const widgetMeta = get().availableWidgets.find(w => w.widgetType === type);
    const minW = widgetMeta?.minW || 4;
    const minH = widgetMeta?.minH || 4;

    // 새 패널 위치 지정 (기본적으로 최하단이나 적당한 위치)
    const newLayoutItem: Layout = {
      i: id,
      x: 0, // 첫번째 열
      y: Infinity, // 빈 공간 중 제일 아래로
      w: minW,
      h: minH,
      minW: minW,
      minH: minH,
    };

    set((state) => ({
      panels: [...state.panels, newPanel],
      layouts: {
        ...state.layouts,
        lg: [...(state.layouts.lg || []), newLayoutItem]
      },
    }));
  },

  removePanel: (id) => {
    set((state) => {
      const newLayouts = { ...state.layouts };
      Object.keys(newLayouts).forEach(bp => {
        newLayouts[bp] = newLayouts[bp].filter(l => l.i !== id);
      });
      return {
        panels: state.panels.filter((p) => p.id !== id),
        layouts: newLayouts,
      };
    });
  },

  updateLayouts: (newLayouts) => {
    set((state) => {
      // react-grid-layout의 onLayoutChange가 반환하는 레이아웃 객체들은 minW, minH 등의 제한 속성을 유실합니다.
      // 따라서 기존 상태에 저장되어 있던 minW, minH 값들을 새 레이아웃에 덮어씌워 보존해야 합니다.
      const preservedLayouts: Record<string, Layout[]> = {};

      Object.keys(newLayouts).forEach(bp => {
        preservedLayouts[bp] = newLayouts[bp].map(newItem => {
          const existingItem = state.layouts[bp]?.find(l => l.i === newItem.i)
            || state.layouts.lg?.find(l => l.i === newItem.i);

          if (existingItem) {
            return {
              ...newItem,
              minW: existingItem.minW,
              minH: existingItem.minH,
              maxW: existingItem.maxW,
              maxH: existingItem.maxH
            };
          }
          return newItem;
        });
      });

      return { layouts: preservedLayouts };
    });
  },

  toggleEditMode: () => {
    const nextEditMode = !get().isEditMode;
    set({ isEditMode: nextEditMode });
    
    // 에디트 모드가 종료될 때 서버에 레이아웃 저장
    if (!nextEditMode) {
      get().saveLayout();
    }
  },

  setTopStatsVisibility: (visibility) => {
    set((state) => ({
      topStatsVisibility: { ...state.topStatsVisibility, ...visibility }
    }));
  },

  fetchLayout: async () => {
    const { username } = useAuthStore.getState();
    if (!username) return;

    try {
      const response = await apiFetch(`/api/layout/${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.panelsJson && data.layoutsJson) {
          set({
            panels: JSON.parse(data.panelsJson),
            layouts: JSON.parse(data.layoutsJson)
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch layout:', e);
    }
  },

  saveLayout: async () => {
    const { panels, layouts } = get();
    const { username } = useAuthStore.getState();
    if (!username) return;

    try {
      await apiFetch('/api/layout', {
        method: 'POST',
        body: JSON.stringify({
          userId: username,
          panelsJson: JSON.stringify(panels),
          layoutsJson: JSON.stringify(layouts),
        }),
      });
    } catch (e) {
      console.error('Failed to save layout:', e);
    }
  },

  fetchAvailableWidgets: async () => {
    try {
      const response = await apiFetch('/api/widgets?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        set({ availableWidgets: data });
      }
    } catch (e) {
      console.error('Failed to fetch available widgets:', e);
    }
  }
}));
