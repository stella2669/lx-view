export interface StatAppSql {
    id: number;
    appId: number;
    baseTime: string;
    totalExecutionCount: number;
    slowQueryCount: number;
    totalExecutionTimeMs: number;
}

export interface LogAppSlowQuery {
    id: number;
    appId: number;
    occurredAt: string;
    sqlQuery: string;
    executionTimeMs: number;
    clientIp: string | null;
    threadName: string | null;
}
