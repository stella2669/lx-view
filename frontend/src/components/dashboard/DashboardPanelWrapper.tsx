import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

interface DashboardPanelWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  panelId: string;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

/**
 * 대시보드 패널을 감싸는 공통 래퍼 컴포넌트입니다.
 * - react-grid-layout의 드래그 및 리사이즈 기능을 위해 forwardRef를 사용합니다.
 * - 편집 모드일 때 오버레이 및 삭제 버튼을 제공합니다.
 * - 패널 컴포넌트들이 부모 Flex 컨테이너를 뚫고 나가는 것을 방지합니다.
 */
const DashboardPanelWrapper = forwardRef<HTMLDivElement, DashboardPanelWrapperProps>(
  ({ panelId, isEditMode, onRemove, children, className = '', style, ...restProps }, ref) => {
    return (
      <div 
        ref={ref} 
        style={style}
        className={`relative flex flex-col h-full w-full group min-w-0 min-h-0 overflow-hidden rounded-lg ${className}`}
        {...restProps}
      >
        {/* 편집 모드일 때 전체 덮는 투명 오버레이 (차트 이벤트 간섭 방지 및 드래그 핸들 용도) */}
        {isEditMode && (
          <div className="dashboard-drag-handle absolute inset-0 z-40 cursor-move bg-black/20 border-2 border-dashed border-cyan-500/60 rounded-lg flex items-center justify-center backdrop-blur-[1px] transition-all hover:bg-black/30">
            <span className="bg-gray-900/80 text-cyan-400 px-3 py-1.5 rounded font-semibold text-sm shadow-lg pointer-events-none">
              Drag to Move
            </span>
          </div>
        )}

        {/* 편집 모드일 때만 보이는 위젯 삭제 버튼 */}
        {isEditMode && (
          <button
            onClick={(e) => { 
                e.stopPropagation(); 
                onRemove(panelId); 
            }}
            className="absolute top-3 right-3 p-1.5 bg-rose-500 text-white rounded-md transition-transform shadow-lg hover:bg-rose-600 hover:scale-110 cursor-pointer z-50"
            title="Remove Widget"
            onMouseDown={(e) => e.stopPropagation()} // 드래그 이벤트가 부모(grid-item)로 전파되는 것 방지
          >
            <X size={16} />
          </button>
        )}
        
        {/* 실제 패널 컴포넌트 렌더링 영역 */}
        <div className="flex-1 w-full h-full relative z-10 min-w-0 min-h-0">
          {children}
        </div>
      </div>
    );
  }
);

DashboardPanelWrapper.displayName = 'DashboardPanelWrapper';

export default DashboardPanelWrapper;
