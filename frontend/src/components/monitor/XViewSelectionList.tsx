import React from 'react';

interface XViewSelectionListProps {
    transactions: any[];
    size: { width: number; height: number };
    pos: { x: number; y: number };
    onClose: () => void;
    onSelectTransaction: (id: string) => void;
    onResizeStart: (e: React.MouseEvent) => void;
    onMoveStart: (e: React.MouseEvent) => void;
}

const XViewSelectionList: React.FC<XViewSelectionListProps> = ({
    transactions,
    size,
    pos,
    onClose,
    onSelectTransaction,
    onResizeStart,
    onMoveStart
}) => {
    if (transactions.length === 0) return null;

    return (
        <div 
            className="absolute bg-gray-800/95 border border-sky-500 p-4 rounded-lg shadow-2xl z-50 text-white flex flex-col"
            style={{ width: size.width, height: size.height, left: pos.x, top: pos.y }}
        >
            {/* Resize Handle (Bottom-Left) */}
            <div 
                onMouseDown={onResizeStart}
                className="absolute left-0 bottom-0 w-4 h-4 cursor-nesw-resize group z-[60]"
            >
                <div className="absolute left-1 bottom-1 w-2 h-2 border-l-2 border-b-2 border-sky-500/50 group-hover:border-sky-400 transition-colors"></div>
            </div>

            {/* 헤더: 드래그로 팝업 이동 */}
            <div 
                className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2 shrink-0 cursor-move select-none"
                onMouseDown={onMoveStart}
            >
                <h4 className="font-bold text-sky-400">Selected Transactions ({transactions.length})</h4>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="text-gray-400 hover:text-white text-xl leading-none"
                >
                    &times;
                </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-2 flex-1 min-h-0 custom-scrollbar">
                {transactions.map(tx => (
                    <div key={tx.id} 
                         className="text-xs bg-gray-900 border border-gray-700 p-2 rounded cursor-pointer hover:border-indigo-500 transition-colors"
                         onClick={() => onSelectTransaction(tx.id)}
                    >
                        <div className="flex justify-between items-center mb-1">
                            {/* [기능 4] 말줄임표 처리 제거: ID 전체 표시 */}
                            <span className="font-mono text-gray-400">{tx.id}</span>
                            <span className={tx.isError ? "text-red-400" : "text-sky-400"}>
                                {tx.responseTimeMs}ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                            <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                            {tx.isError && <span className="bg-red-900/50 text-red-200 px-1 rounded">Error</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 리스트가 길어질 경우 리렌더링 최적화
export default React.memo(XViewSelectionList);
