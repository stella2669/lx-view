import React from 'react';
import { createPortal } from 'react-dom';
import { X, ServerCrash, Clock, Fingerprint, Activity } from 'lucide-react';
import { DateTime } from 'luxon';
import type { AppError } from '../../types/error';

interface AppErrorDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    error: AppError;
}

export const AppErrorDetailModal: React.FC<AppErrorDetailModalProps> = ({ isOpen, onClose, error }) => {
    if (!isOpen || !error) return null;

    const formatTime = (isoString: string) => {
        return DateTime.fromISO(isoString).toFormat('yyyy-MM-dd HH:mm:ss.SSS');
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-panel rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border-main shadow-2xl transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-panel-header/50 rounded-t-xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <ServerCrash className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-main">Application Error Detail</h2>
                            <div className="flex items-center text-xs text-muted font-mono mt-1">
                                <span>ID: {error.id}</span>
                                <span className="mx-2">•</span>
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{formatTime(error.occurredAt)}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted hover:text-main hover:bg-panel-header rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

                    {/* Exception Summary */}
                    <div className="bg-panel-header/50 border border-border-main rounded-lg overflow-hidden">
                        <div className="px-4 py-2 border-b border-border-main bg-rose-500/5">
                            <h3 className="text-xs font-semibold text-rose-400 flex items-center">
                                <Activity className="w-4 h-4 mr-2" />
                                Exception
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <span className="text-xs text-muted block mb-1">Name</span>
                                <div className="text-sm text-main font-mono bg-panel p-2 rounded border border-border-main">
                                    {error.exceptionName}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-muted block mb-1">Message</span>
                                <div className="text-sm text-rose-400 font-mono bg-panel p-3 rounded border border-rose-500/20 break-words whitespace-pre-wrap">
                                    {error.message}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Request Context (If available) */}
                    {(error.requestUrl || error.httpMethod || error.clientIp) && (
                        <div className="bg-panel-header/50 border border-border-main rounded-lg overflow-hidden">
                            <div className="px-4 py-2 border-b border-border-main bg-panel">
                                <h3 className="text-xs font-semibold text-muted flex items-center">
                                    <Fingerprint className="w-4 h-4 mr-2" />
                                    Request Context
                                </h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {error.httpMethod && (
                                    <div>
                                        <span className="text-xs text-muted block">Method</span>
                                        <span className="text-sm text-text-accent font-mono font-bold">{error.httpMethod}</span>
                                    </div>
                                )}
                                {error.requestUrl && (
                                    <div className="col-span-2">
                                        <span className="text-xs text-muted block">URL</span>
                                        <span className="text-sm text-main font-mono truncate block" title={error.requestUrl}>
                                            {error.requestUrl}
                                        </span>
                                    </div>
                                )}
                                {error.clientIp && (
                                    <div>
                                        <span className="text-xs text-muted block">Client IP</span>
                                        <span className="text-sm text-main font-mono">{error.clientIp}</span>
                                    </div>
                                )}
                                {error.threadName && (
                                    <div className="col-span-2">
                                        <span className="text-xs text-muted block">Thread</span>
                                        <span className="text-xs leading-relaxed text-muted font-mono bg-panel p-1.5 px-2 rounded inline-block border border-border-main/50">
                                            {error.threadName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Stack Trace */}
                    {error.stackTrace && (
                        <div className="bg-panel-header/50 border border-border-main rounded-lg overflow-hidden flex flex-col">
                            <div className="px-4 py-2 border-b border-border-main bg-panel flex justify-between items-center">
                                <h3 className="text-xs font-semibold text-muted">Stack Trace</h3>
                            </div>
                            <div className="p-4 bg-panel-header/30 overflow-x-auto">
                                <pre className="text-[11px] font-mono leading-relaxed text-main">
                                    <code dangerouslySetInnerHTML={{ __html: highlightStackTrace(error.stackTrace) }} />
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// Simple utility to highlight stack trace lines
function highlightStackTrace(stackTrace: string): string {
    if (!stackTrace) return '';
    return stackTrace
        .split('\n')
        .map(line => {
            // Highlight "at com.apm.dashboard..." (our own code) differently from framework code
            if (line.includes('at com.apm.dashboard')) {
                return `<span class="text-blue-400 font-bold">${line}</span>`;
            }
            if (line.trim().startsWith('at ')) {
                return `<span class="text-gray-500">${line}</span>`;
            }
            if (line.includes('Exception:') || line.includes('Error:')) {
                return `<span class="text-rose-400 font-bold">${line}</span>`;
            }
            return line;
        })
        .join('\n');
}
