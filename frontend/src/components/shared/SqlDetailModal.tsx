import React from 'react';
import BaseModal from '../shared/BaseModal';
import type { LogAppSlowQuery } from '../../types/sql';
import { Clock, ShieldCheck, AlertTriangle, Cpu, Globe } from 'lucide-react';
import { DateTime } from 'luxon';

interface SqlDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sqlData: LogAppSlowQuery;
}

const SqlDetailModal: React.FC<SqlDetailModalProps> = ({ isOpen, onClose, sqlData }) => {
    // SQL 키워드 하이라이팅 (보안 & 이스케이프 파싱 이슈 원천 차단형 토크나이저)
    const renderSqlNodes = (sql: string) => {
        // SQL 문법의 주요 구성요소를 기준으로 텍스트를 분할 (캡처 그룹 포함)
        const parts = sql.split(/(\b(?:SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|INSERT|UPDATE|DELETE|JOIN|LEFT JOIN|INNER JOIN|VALUES|SET)\b|\b(?:AS|IN|LIKE|IS NULL|IS NOT NULL|COUNT|SUM|MAX|MIN|AVG)\b|'(?:[^']|'')*'|=|>|<|>=|<=|<>|!=)/gi);

        return parts.map((part, index) => {
            if (!part) return null;
            const upper = part.toUpperCase();

            // 1. 주요 예약어 (Main Keywords)
            if (/^(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|INSERT|UPDATE|DELETE|JOIN|LEFT JOIN|INNER JOIN|VALUES|SET)$/.test(upper)) {
                return <span key={index} style={{ color: '#f472b6', fontWeight: 700 }}>{part}</span>;
            }
            // 2. 보조 예약어 / 함수 (Sub Keywords / Functions)
            if (/^(AS|IN|LIKE|IS NULL|IS NOT NULL|COUNT|SUM|MAX|MIN|AVG)$/.test(upper)) {
                return <span key={index} style={{ color: '#22d3ee', fontWeight: 600 }}>{part}</span>;
            }
            // 3. 문자열 리터럴 (String Literals)
            if (/^'([^']|'')*'$/.test(part)) {
                return <span key={index} style={{ color: '#4ade80' }}>{part}</span>;
            }
            // 4. 연산자 (Operators)
            if (/^(=|>|<|>=|<=|<>|!=)$/.test(part)) {
                return <span key={index} style={{ color: '#facc15' }}>{part}</span>;
            }

            // 기타 일반 텍스트
            return <React.Fragment key={index}>{part}</React.Fragment>;
        });
    };

    const isSlow = sqlData.executionTimeMs >= 1000;
    const isError = sqlData.executionTimeMs === -1;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3 w-full">
                    <span className="text-blue-400 shrink-0">Query Details:</span>
                    <span className="text-white bg-gray-800 px-3 py-1 rounded-md text-sm truncate font-mono max-w-[400px]">
                        ID #{sqlData.id}
                    </span>
                    <div className="ml-auto flex items-center gap-2 pr-6">
                        {isError ? (
                            <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-1 rounded text-xs px-3 font-bold flex items-center gap-1">
                                <AlertTriangle size={14} /> ERROR
                            </span>
                        ) : isSlow ? (
                            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded text-xs px-3 font-bold flex items-center gap-1">
                                <Clock size={14} /> SLOW
                            </span>
                        ) : (
                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded text-xs px-3 font-bold flex items-center gap-1">
                                <ShieldCheck size={14} /> OK
                            </span>
                        )}
                        <span className="bg-gray-800 px-3 py-1 rounded text-cyan-400 font-mono text-sm border border-gray-700">
                            {sqlData.executionTimeMs} ms
                        </span>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                {/* Meta Information Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-panel border border-border-main p-3 rounded-lg flex items-center gap-3">
                        <Clock className="text-muted" size={20} />
                        <div>
                            <div className="text-muted text-xs uppercase tracking-wider">Executed At</div>
                            <div className="text-main font-mono text-sm">
                                {DateTime.fromISO(sqlData.occurredAt).toFormat('yyyy-MM-dd HH:mm:ss.SSS')}
                            </div>
                        </div>
                    </div>
                    <div className="bg-panel border border-border-main p-3 rounded-lg flex items-center gap-3">
                        <Cpu className="text-muted" size={20} />
                        <div>
                            <div className="text-muted text-xs uppercase tracking-wider">Thread</div>
                            <div className="text-main font-mono text-sm truncate w-40" title={sqlData.threadName || 'Unknown'}>
                                {sqlData.threadName || 'Unknown'}
                            </div>
                        </div>
                    </div>
                    <div className="bg-panel border border-border-main p-3 rounded-lg flex items-center gap-3">
                        <Globe className="text-muted" size={20} />
                        <div>
                            <div className="text-muted text-xs uppercase tracking-wider">Client IP</div>
                            <div className="text-main font-mono text-sm">
                                {sqlData.clientIp || '127.0.0.1'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SQL Body */}
                <div className="bg-panel-header/30 border border-border-main rounded-lg overflow-hidden flex flex-col h-[400px]">
                    <div className="bg-panel-header/50 px-4 py-2 border-b border-border-main flex justify-between items-center">
                        <span className="text-xs text-muted uppercase tracking-widest font-semibold font-mono">
                            SQL Statement
                        </span>
                        <button
                            onClick={() => navigator.clipboard.writeText(sqlData.sqlQuery)}
                            className="text-xs bg-panel hover:bg-panel-header px-3 py-1 rounded transition-colors text-main border border-border-main"
                        >
                            Copy Payload
                        </button>
                    </div>
                    <div className="p-4 overflow-auto flex-1 custom-scrollbar">
                        {/* Tokenizer 방식으로 변경: dangerouslySetInnerHTML 제거 및 React Node 직접 렌더링 */}
                        <div
                            className="font-mono text-sm leading-relaxed text-main break-words"
                            style={{ whiteSpace: 'pre-wrap' }}
                        >
                            {renderSqlNodes(sqlData.sqlQuery)}
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default SqlDetailModal;
