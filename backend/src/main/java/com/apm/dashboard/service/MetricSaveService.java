package com.apm.dashboard.service;

import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.model.entity.AppIncidentLog;
import com.apm.dashboard.model.entity.IncidentType;
import com.apm.dashboard.repository.AppIncidentLogRepository;
import com.apm.dashboard.repository.AppInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 에이전트로부터 수신된 다양한 메트릭 데이터를 통합적으로 분류하고 저장하는 핵심 서비스입니다.
 * 비동기 처리를 기반으로 데이터 파싱, DB 저장, 실시간 웹소켓 브로드캐스트를 조율합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MetricSaveService {

    private final SimpMessagingTemplate messagingTemplate;
    private final TransactionService transactionService;
    private final TransactionDetailService transactionDetailService;
    private final SqlMonitoringService sqlMonitoringService;
    private final MetricAggregatorService metricAggregatorService;
    private final AppIncidentLogRepository appIncidentLogRepository;
    private final AppIdResolver appIdResolver;

    /**
     * APP_ERROR 중복 저장 방지 버퍼 (Key: agentName + "_" + txId)
     * 동일 txId의 에러는 30초 이내 재수신 시 저장을 건너뜁니다.
     */
    private final ConcurrentHashMap<String, Long> errorDeduplicationBuffer = new ConcurrentHashMap<>();
    private static final long ERROR_DEDUP_WINDOW_MS = 30_000L;

    /**
     * 에이전트로부터 수신한 메트릭 배치 데이터를 비동기적으로 처리합니다.
     * 각 메트릭의 타입(TRANSACTION, JVM, SQL, ERROR_DETAIL 등)을 판별하여 적절한 처리기로 위임합니다.
     * 
     * @param metrics 수신된 원시 데이터 리스트
     */
    @Async
    public void saveMetricsAsync(List<Map<String, Object>> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return;
        }

        try {
            long startTime = System.currentTimeMillis();

            List<TransactionData> transactions = new ArrayList<>();
            List<JvmMetricsData> jvmMetrics = new ArrayList<>();

            for (Map<String, Object> metric : metrics) {
                String agentName = (String) metric.getOrDefault("agentName", "Unknown-Agent");
                String type = (String) metric.get("type");

                if (log.isDebugEnabled()) {
                    log.debug("Processing metric - Agent: {}, Type: {}", agentName, type);
                }

                // 타입별 처리기 분기
                if ("TRANSACTION".equalsIgnoreCase(type)) {
                    TransactionData txData = parseTransactionData(metric);
                    if (txData != null) {
                        transactions.add(txData);
                        // 1분 집계 버퍼에 누적 (정상/에러 트랜잭션 모두 통계에 포함)
                        metricAggregatorService.bufferTx(agentName, txData);
                    }
                } else if ("JVM".equalsIgnoreCase(type)) {
                    JvmMetricsData jvmData = parseJvmMetricsData(metric);
                    if (jvmData != null) {
                        jvmMetrics.add(jvmData);
                        // 최신 스냅샷 버퍼 갱신 (1분마다 DB 저장됨)
                        metricAggregatorService.bufferJvm(agentName, jvmData);
                    }
                } else if ("ERROR_DETAIL".equalsIgnoreCase(type)) {
                    // 상세 정보 저장 및 DB 에러 로그 적재
                    transactionDetailService.saveDetail(metric);
                    saveAppErrorToDb(agentName, metric);
                } else if ("SQL".equalsIgnoreCase(type)) {
                    processSqlMetric(agentName, metric);
                }
            }

            // 실시간 차트 업데이트를 위한 웹소켓 브로드캐스트
            if (!transactions.isEmpty()) {
                transactionService.addTransactions(transactions);
                messagingTemplate.convertAndSend("/topic/transactions", transactions);
            }

            if (!jvmMetrics.isEmpty()) {
                JvmMetricsData lastJvm = jvmMetrics.get(jvmMetrics.size() - 1);
                if (lastJvm != null) {
                    messagingTemplate.convertAndSend("/topic/jvm-metrics", lastJvm);
                }
            }

            log.debug("Successfully processed and mapped {} metrics in {} ms", metrics.size(), (System.currentTimeMillis() - startTime));

        } catch (Exception e) {
            log.error("[MetricSaveService] Failed to parse and save asynchronous metrics.", e);
        }
    }

    /** Map 데이터를 TransactionData 객체로 변환 (방어적 타입 변환) */
    private TransactionData parseTransactionData(Map<String, Object> metric) {
        try {
            String id = metric.containsKey("txId") ? metric.get("txId").toString() : UUID.randomUUID().toString();
            long timestamp = getLongValue(metric, "timestamp", System.currentTimeMillis());
            int responseTimeMs = getIntValue(metric, "responseTimeMs", 0);
            String serviceName = metric.containsKey("serviceName") ? metric.get("serviceName").toString() : "Unknown";
            boolean isError = getBooleanValue(metric, "isError", false);
            int httpStatusCode = getIntValue(metric, "httpStatusCode", 200);

            return new TransactionData(id, timestamp, responseTimeMs, serviceName, isError, httpStatusCode);
        } catch (Exception e) {
            log.warn("Failed to parse TransactionData: {}", e.getMessage());
            return null;
        }
    }

    /** Map 데이터를 JvmMetricsData 객체로 변환 (방어적 타입 변환) */
    private JvmMetricsData parseJvmMetricsData(Map<String, Object> metric) {
        try {
            long timestamp = getLongValue(metric, "timestamp", System.currentTimeMillis());
            double processCpuLoad = getDoubleValue(metric, "processCpuLoad", 0.0);
            double systemCpuLoad = getDoubleValue(metric, "systemCpuLoad", 0.0);
            long heapUsed = getLongValue(metric, "heapUsed", 0);
            long heapMax = getLongValue(metric, "heapMax", 0);
            long heapCommitted = getLongValue(metric, "heapCommitted", 0);
            double heapUsagePercent = getDoubleValue(metric, "heapUsagePercent", 0.0);
            long gcCount = getLongValue(metric, "gcCount", 0);
            long gcTime = getLongValue(metric, "gcTime", 0);
            int liveThreads = getIntValue(metric, "liveThreads", 0);
            int deadlockedThreads = getIntValue(metric, "deadlockedThreads", 0);

            return new JvmMetricsData(timestamp, processCpuLoad, systemCpuLoad, heapUsed, heapMax, heapCommitted,
                    heapUsagePercent, gcCount, gcTime, liveThreads, deadlockedThreads);
        } catch (Exception e) {
            log.warn("Failed to parse JvmMetricsData: {}", e.getMessage());
            return null;
        }
    }

    /** SQL 성능 메트릭 판별 후 타입에 따라 AppIncidentLog에 저장 + AppStatSql 집계 버퍼 누적 */
    private void processSqlMetric(String agentName, Map<String, Object> metric) {
        try {
            String sql = (String) metric.get("sql");
            long duration = getLongValue(metric, "responseTimeMs", 0);
            boolean isError = getBooleanValue(metric, "isError", false);
            String txId = (String) metric.getOrDefault("txId", "UNKNOWN");

            // 1. AppIncidentLog 저장 (에러는 SQL_ERROR, 슬로우쿼리는 SLOW_QUERY)
            if (isError) {
                sqlMonitoringService.saveSqlErrorSafely(agentName, sql, duration, txId);
            } else if (duration > 1000) {
                // 슬로우쿼리는 임계치(1초) 초과 시에만 개별 로그 저장
                sqlMonitoringService.saveSlowQueryLogSafely(agentName, sql, duration, txId);
            }

            // 2. AppStatSql 집계용 버퍼 누적 (모든 SQL, 에러/정상 무관)
            metricAggregatorService.bufferSql(agentName, duration, isError);

        } catch (Exception e) {
            log.warn("Failed to process SQL metric: {}", e.getMessage());
        }
    }

    /**
     * 수신된 애플리케이션 예외 내역(ERROR_DETAIL)을 AppIncidentLog(APP_ERROR 타입)에 영구 적재합니다.
     * txId 기반 중복 방지(30초 윈도우)를 적용하여 동일 에러의 중복 저장을 차단합니다.
     */
    private void saveAppErrorToDb(String agentName, Map<String, Object> metric) {
        try {
            // txId가 없는 경우 exceptionName+requestUrl 해시로 대체 키 생성
            String txId = metric.containsKey("txId")
                    ? metric.get("txId").toString()
                    : String.valueOf((String.valueOf(metric.get("exceptionName")) + metric.get("requestUrl")).hashCode());

            String dedupKey = agentName + "_" + txId;
            long now = System.currentTimeMillis();
            Long lastSaved = errorDeduplicationBuffer.get(dedupKey);

            if (lastSaved != null && (now - lastSaved) < ERROR_DEDUP_WINDOW_MS) {
                log.debug("[APP_ERROR] 중복 suppressed. agent={}, txId={}", agentName, txId);
                return;
            }
            errorDeduplicationBuffer.put(dedupKey, now);

            Long appId = appIdResolver.resolveAppId(agentName);

            AppIncidentLog incidentLog = AppIncidentLog.builder()
                    .appId(appId)
                    .incidentType(IncidentType.APP_ERROR)
                    .occurredAt(java.time.LocalDateTime.now())
                    .txId(txId)  // 트랜잭션 추적용 — 중복 방지 키와 동일 값 사용
                    .exceptionName((String) metric.get("exceptionName"))
                    .message((String) metric.get("errorMessage"))
                    .stackTrace((String) metric.get("stackTrace"))
                    .requestUrl((String) metric.get("requestUrl"))
                    .httpMethod((String) metric.get("httpMethod"))
                    .clientIp((String) metric.get("clientIp"))
                    .requestParams((String) metric.get("requestParams"))
                    .requestBody((String) metric.get("requestBody"))
                    .threadName((String) metric.get("threadName"))
                    .build();

            appIncidentLogRepository.save(incidentLog);
            log.debug("[APP_ERROR] Saved incident. agent={}, txId={}", agentName, txId);
        } catch (Exception e) {
            log.error("[APP_ERROR] Failed to save incident to DB", e);
        }
    }

    // --- 타입 캐스팅 방어용 헬퍼 메서드 (Type Casting Safety) ---
    private long getLongValue(Map<String, Object> map, String key, long defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).longValue();
        if (val instanceof String) return Long.parseLong((String) val);
        return defaultValue;
    }

    private int getIntValue(Map<String, Object> map, String key, int defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) return Integer.parseInt((String) val);
        return defaultValue;
    }

    private double getDoubleValue(Map<String, Object> map, String key, double defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof String) return Double.parseDouble((String) val);
        return defaultValue;
    }

    private boolean getBooleanValue(Map<String, Object> map, String key, boolean defaultValue) {
        Object val = map.get(key);
        if (val instanceof Boolean) return (Boolean) val;
        if (val instanceof String) return Boolean.parseBoolean((String) val);
        return defaultValue;
    }

    /**
     * OOM 방지: 1분마다 실행되어 만료된 (30초 지난) Deduplication 버퍼 항목을 정리합니다.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void cleanupDeduplicationBuffer() {
        long now = System.currentTimeMillis();
        int initialSize = errorDeduplicationBuffer.size();
        errorDeduplicationBuffer.entrySet().removeIf(entry -> (now - entry.getValue()) > ERROR_DEDUP_WINDOW_MS);
        int finalSize = errorDeduplicationBuffer.size();
        
        if (initialSize != finalSize && log.isDebugEnabled()) {
            log.debug("Cleaned up {} expired items from errorDeduplicationBuffer", (initialSize - finalSize));
        }
    }
}
