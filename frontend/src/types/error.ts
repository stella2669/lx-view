export interface AppError {
    id: number;
    appId: number;
    occurredAt: string;
    exceptionName: string;
    message: string;
    stackTrace: string;
    requestUrl?: string;
    httpMethod?: string;
    clientIp?: string;
    requestParams?: string;
    requestBody?: string;
    threadName?: string;
}

export interface SqlError {
    id: number;
    appId: number;
    occurredAt: string;
    sqlQuery: string;
    errorCode?: string;
    sqlState?: string;
    errorMessage?: string;
    executionTimeMs?: number;
    clientIp?: string;
}

export interface UnifiedError {
    id: string; // e.g., "APP-12", "SQL-45"
    type: 'APP' | 'SQL';
    occurredAt: string;
    title: string;
    message: string;
    source: string;
    originalPayload: AppError | SqlError;
}
