import React from 'react';

interface XViewTransactionDetailProps {
    detailData: any;
    loading: boolean;
    error: string | null;
    size: { width: number; height: number };
    pos: { x: number; y: number };
    onClose: () => void;
    onResizeStart: (e: React.MouseEvent) => void;
    onMoveStart: (e: React.MouseEvent) => void;
}

const XViewTransactionDetail: React.FC<XViewTransactionDetailProps> = ({
    detailData,
    loading,
    error,
    size,
    pos,
    onClose,
    onResizeStart,
    onMoveStart
}) => {
    return (
        <div 
            className="absolute bg-gray-800/95 border border-indigo-500 p-5 rounded-lg shadow-2xl z-[70] text-white flex flex-col"
            style={{ width: size.width, height: size.height, left: pos.x, top: pos.y }}
        >
            {/* Resize Handle (Bottom-Right) */}
            <div 
                onMouseDown={onResizeStart}
                className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize group z-[60]"
            >
                <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-indigo-500/50 group-hover:border-indigo-400 transition-colors"></div>
            </div>

            {/* 헤더: 드래그로 팝업 이동 */}
            <div 
                className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3 shrink-0 cursor-move select-none"
                onMouseDown={onMoveStart}
            >
                <h4 className="font-bold text-indigo-400">Transaction Detail</h4>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="text-gray-400 hover:text-white text-xl leading-none"
                >
                    &times;
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                        <span className="text-gray-400 text-xs text-center animate-pulse">Loading transaction data...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="text-red-400 mb-2">⚠️</div>
                        <p className="text-red-400 text-sm font-semibold mb-1">Load Failed</p>
                        <p className="text-gray-400 text-xs break-all">{error}</p>
                    </div>
                ) : detailData ? (
                    <div className="text-sm space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="col-span-3 pb-1 border-b border-gray-700/50 flex justify-between">
                                <span className="text-indigo-300 font-mono">{detailData.txId || detailData.id}</span>
                                <span className={`font-bold ${(detailData.isError || detailData.error || detailData.httpStatusCode >= 400) ? 'text-red-400' : 'text-green-400'}`}>
                                    {detailData.httpStatusCode}
                                </span>
                            </div>
                            <div className="text-gray-400">Service</div>
                            <div className="col-span-2 text-gray-200 truncate">{detailData.serviceName}</div>
                            
                            <div className="text-gray-400">Time</div>
                            <div className="col-span-2 text-gray-200">{new Date(detailData.timestamp).toLocaleString()}</div>
                            
                            <div className="text-gray-400">Duration</div>
                            <div className="col-span-2 text-indigo-400 font-bold">{detailData.responseTimeMs} ms</div>

                            {detailData.httpMethod && (
                                <>
                                    <div className="text-gray-400">Request</div>
                                    <div className="col-span-2 text-gray-200">
                                        <span className="text-indigo-400 font-bold mr-2">{detailData.httpMethod}</span>
                                        {detailData.requestUrl}
                                    </div>
                                </>
                            )}
                        </div>

                        {(detailData.isError || detailData.error || detailData.httpStatusCode >= 400) && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-red-400 font-semibold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    {detailData.exceptionName || 'Error Detail'}
                                </p>
                                <p className="text-xs text-red-300 mb-3 bg-red-950/30 p-2 rounded border border-red-900/50">
                                    {detailData.errorMessage || 'No error message available'}
                                </p>
                                
                                {detailData.stackTrace && (
                                    <>
                                        <p className="text-gray-400 mb-2 text-xs">Stack Trace</p>
                                        <pre className="text-[10px] leading-tight text-gray-400 bg-gray-950 p-3 rounded overflow-x-auto border border-gray-800 font-mono">
                                            {detailData.stackTrace}
                                        </pre>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="text-gray-500 mb-2">📭</div>
                        <p className="text-gray-400 text-sm font-semibold mb-1">No Data Available</p>
                        <p className="text-gray-500 text-xs">Could not retrieve details for this transaction.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 불필요한 재렌더링 방지
export default React.memo(XViewTransactionDetail);
