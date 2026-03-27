import React from 'react';

interface XViewTransactionDetailProps {
    detailData: any;
    loading: boolean;
    size: { width: number; height: number };
    onClose: () => void;
    onResizeStart: (e: React.MouseEvent) => void;
}

const XViewTransactionDetail: React.FC<XViewTransactionDetailProps> = ({
    detailData,
    loading,
    size,
    onClose,
    onResizeStart
}) => {
    return (
        <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800/95 border border-indigo-500 p-5 rounded-lg shadow-2xl z-[70] text-white flex flex-col"
            style={{ width: size.width, height: size.height }}
        >
            {/* Resize Handle (Bottom-Right) */}
            <div 
                onMouseDown={onResizeStart}
                className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize group z-[60]"
            >
                <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-indigo-500/50 group-hover:border-indigo-400 transition-colors"></div>
            </div>

            <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3 shrink-0">
                <h4 className="font-bold text-indigo-400">Transaction Detail</h4>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            {loading ? (
                <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                </div>
            ) : detailData ? (
                <div className="text-sm space-y-3 overflow-y-auto custom-scrollbar pr-1">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="col-span-3 pb-1 border-b border-gray-700/50 flex justify-between">
                            <span className="text-indigo-300 font-mono">{detailData.txId}</span>
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
            ) : null}
        </div>
    );
};

// 불필요한 재렌더링 방지
export default React.memo(XViewTransactionDetail);
