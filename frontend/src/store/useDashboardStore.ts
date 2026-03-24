import { create } from 'zustand';
import type { Layout } from 'react-grid-layout';

export type PanelType = 
  | 'TransactionFlow'
  | 'ResponseStats'
  | 'XViewChart'
  | 'ActiveServiceChart'
  | 'JvmMetrics'
  | 'SqlMonitorPanel'
  | 'UnifiedErrorList';

export type TopStatKey = 'activeServices' | 'totalRequests' | 'totalErrors' | 'tps' | 'jvmThreads';

export interface DashboardPanel {
  id: string;
  type: PanelType;
}

interface DashboardState {
  panels: DashboardPanel[];
  layouts: Record<string, Layout[]>;
  isEditMode: boolean;
  topStatsVisibility: Record<TopStatKey, boolean>;
  addPanel: (type: PanelType) => void;
  removePanel: (id: string) => void;
  updateLayouts: (newLayouts: Record<string, Layout[]>) => void;
  toggleEditMode: () => void;
  toggleTopStat: (key: TopStatKey) => void;
}

// 초기 기본 레이아웃 및 패널
const initialPanels: DashboardPanel[] = [
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
    { i: 'panel-txn-flow', x: 0, y: 0, w: 8, h: 4, minW: 3, minH: 3 },
    { i: 'panel-res-stats', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'panel-xview', x: 0, y: 4, w: 8, h: 6, minW: 4, minH: 4 },
    { i: 'panel-active-svc', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'panel-jvm', x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'panel-error', x: 0, y: 10, w: 4, h: 6, minW: 3, minH: 3 },
    { i: 'panel-sql', x: 4, y: 10, w: 8, h: 6, minW: 4, minH: 3 },
  ]
};

export const useDashboardStore = create<DashboardState>((set) => ({
  panels: initialPanels,
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
    
    // 새 패널 위치 지정 (기본적으로 최하단이나 적당한 위치)
    const newLayoutItem: Layout = {
      i: id,
      x: 0, // 첫번째 열
      y: Infinity, // 빈 공간 중 제일 아래로
      w: 4, // 기본 너비 4
      h: 4, // 기본 높이 4
      minW: 3, // 최소 너비
      minH: 3, // 최소 높이
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
    set((state) => ({ isEditMode: !state.isEditMode }));
  },
  
  toggleTopStat: (key) => {
    set((state) => ({
      topStatsVisibility: {
        ...state.topStatsVisibility,
        [key]: !state.topStatsVisibility[key]
      }
    }));
  }
}));
