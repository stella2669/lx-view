import React, { useState, useMemo } from 'react';
import { Clock, AlertTriangle, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { TransactionData } from '../../store/useStore';
import BaseModal from '../shared/BaseModal';

interface TransactionListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    transactions: TransactionData[];
}

type SortOrder = 'asc' | 'desc';
type SortConfig = { key: keyof TransactionData; direction: SortOrder } | null;

const TransactionListModal: React.FC<TransactionListModalProps> = ({ isOpen, onClose, title, transactions }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        timestamp: 110,
        id: 120,
        serviceName: 160,
        responseTimeMs: 140,
        httpStatusCode: 100,
        isError: 80
    });

    const handleSort = (key: keyof TransactionData) => {
        let direction: SortOrder = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTransactions = useMemo(() => {
        if (!sortConfig) return transactions;

        return [...transactions].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortConfig]);

    const startResize = (e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = colWidths[colId];

        const doDrag = (dragEvent: MouseEvent) => {
            setColWidths(prev => ({
                ...prev,
                [colId]: Math.max(50, startWidth + dragEvent.clientX - startX)
            }));
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const formatDate = (timestamp: number) => {
        const d = new Date(timestamp);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    };

    const renderSortIcon = (key: keyof TransactionData) => {
        if (sortConfig?.key === key) {
            return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 inline" /> : <ArrowDown size={14} className="ml-1 inline" />;
        }
        return <ArrowUpDown size={14} className="ml-1 inline opacity-0 group-hover:opacity-50 transition-opacity" />;
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <span className="text-blue-400">Response Stats:</span>
                    <span className="text-white bg-gray-800 px-3 py-1 rounded-md text-sm">{title}</span>
                    <span className="text-gray-400 text-sm ml-2">({transactions.length} items)</span>
                </>
            }
        >
            {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <Clock size={32} className="mb-2 opacity-50" />
                    <p>No transactions found for this category in the last 5 minutes.</p>
                </div>
            ) : (
                <table className="text-left text-sm text-gray-300 table-fixed min-w-full w-max">
                    <thead className="text-xs uppercase bg-gray-800/50 text-gray-400 sticky top-0 z-10">
                        <tr>
                            {[
                                { id: 'timestamp', label: 'Time', align: 'left' },
                                { id: 'id', label: 'TxID', align: 'left' },
                                { id: 'serviceName', label: 'Service Name', align: 'left' },
                                { id: 'responseTimeMs', label: 'Response Time', align: 'right' },
                                { id: 'httpStatusCode', label: 'Status', align: 'center' },
                                { id: 'isError', label: 'Result', align: 'center' },
                            ].map((col, i, arr) => (
                                <th
                                    key={col.id}
                                    style={{ width: colWidths[col.id], minWidth: colWidths[col.id], maxWidth: colWidths[col.id] }}
                                    className={`relative px-4 py-3 font-medium group cursor-pointer select-none
                                                    ${i === 0 ? 'rounded-tl-lg' : ''} 
                                                    ${i === arr.length - 1 ? 'rounded-tr-lg' : ''}`}
                                    onClick={() => handleSort(col.id as keyof TransactionData)}
                                >
                                    <div className={`flex items-center justify-${col.align === 'center' ? 'center' : col.align === 'right' ? 'end' : 'start'}`}>
                                        {col.label}
                                        {renderSortIcon(col.id as keyof TransactionData)}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 z-20"
                                        onMouseDown={(e) => startResize(e, col.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.map((tx, idx) => (
                            <tr
                                key={`${tx.id}-${idx}`}
                                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                            >
                                <td style={{ width: colWidths.timestamp, minWidth: colWidths.timestamp, maxWidth: colWidths.timestamp }} className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-400 truncate">
                                    {formatDate(tx.timestamp)}
                                </td>
                                <td style={{ width: colWidths.id, minWidth: colWidths.id, maxWidth: colWidths.id }} className="px-4 py-3 font-mono text-xs truncate" title={tx.id}>
                                    {tx.id}
                                </td>
                                <td style={{ width: colWidths.serviceName, minWidth: colWidths.serviceName, maxWidth: colWidths.serviceName }} className="px-4 py-3 truncate" title={tx.serviceName}>
                                    <span className="bg-gray-800 px-2 py-1 rounded text-xs">
                                        {tx.serviceName}
                                    </span>
                                </td>
                                <td style={{ width: colWidths.responseTimeMs, minWidth: colWidths.responseTimeMs, maxWidth: colWidths.responseTimeMs }} className="px-4 py-3 text-right truncate">
                                    <span className={`font-mono ${tx.responseTimeMs > 3000 ? 'text-pink-400' : 'text-blue-300'}`}>
                                        {tx.responseTimeMs.toLocaleString()} ms
                                    </span>
                                </td>
                                <td style={{ width: colWidths.httpStatusCode, minWidth: colWidths.httpStatusCode, maxWidth: colWidths.httpStatusCode }} className="px-4 py-3 text-center truncate">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.httpStatusCode >= 400 || tx.isError ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                        {tx.httpStatusCode || (tx.isError ? '500' : '200')}
                                    </span>
                                </td>
                                <td style={{ width: colWidths.isError, minWidth: colWidths.isError, maxWidth: colWidths.isError }} className="px-4 py-3 text-center flex justify-center truncate">
                                    {tx.isError ? (
                                        <AlertTriangle size={16} className="text-pink-400" />
                                    ) : (
                                        <ShieldCheck size={16} className="text-green-400" />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </BaseModal>
    );
};

export default TransactionListModal;
