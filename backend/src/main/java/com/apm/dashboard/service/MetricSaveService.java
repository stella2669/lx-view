package com.apm.dashboard.service;

import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.repository.AppInfoRepository;
import com.apm.dashboard.repository.LogAppErrorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    private final SqlErrorLoggingService sqlErrorLoggingService;
    private final LogAppErrorRepository logAppErrorRepository;
    private final AppInfoRepository appInfoRepository;

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
                    if (txData != null) transactions.add(txData);
                } else if ("JVM".equalsIgnoreCase(type)) {
                    JvmMetricsData jvmData = parseJvmMetricsData(metric);
                    if (jvmData != null) jvmMetrics.add(jvmData);
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

    /** SQL 성능 메트릭 판별 후 정상/에러 로깅 서비스로 전달 */
    private void processSqlMetric(String agentName, Map<String, Object> metric) {
        try {
            String sql = (String) metric.get("sql");
            long duration = getLongValue(metric, "responseTimeMs", 0);
            boolean isError = getBooleanValue(metric, "isError", false);
            String txId = (String) metric.getOrDefault("txId", "UNKNOWN");

            if (isError) {
                sqlErrorLoggingService.saveErrorLogSafely(agentName, sql, duration, txId);
            } else {
                sqlMonitoringService.saveSlowQueryLogSafely(agentName, sql, duration, txId);
            }
        } catch (Exception e) {
            log.warn("Failed to process SQL metric: {}", e.getMessage());
        }
    }

    /** 수신된 애플리케이션 예외 내역(ERROR_DETAIL)을 DB에 영구 적재 */
    private void saveAppErrorToDb(String agentName, Map<String, Object> metric) {
        try {
            Long appId = appInfoRepository.findByAppKey(agentName)
                    .map(com.apm.dashboard.model.entity.AppInfo::getId)
                    .orElse(1L);

            com.apm.dashboard.model.entity.LogAppError errorEntity = com.apm.dashboard.model.entity.LogAppError
                    .builder()
                    .appId(appId)
                    .occurredAt(java.time.LocalDateTime.now())
                    .exceptionName((String) metric.get("exceptionName"))
                    .errorMessage((String) metric.get("errorMessage"))
                    .stackTrace((String) metric.get("stackTrace"))
                    .requestUrl((String) metric.get("requestUrl"))
                    .httpMethod((String) metric.get("httpMethod"))
                    .clientIp((String) metric.get("clientIp"))
                    .requestParams((String) metric.get("requestParams"))
                    .threadName((String) metric.get("threadName"))
                    .build();

            logAppErrorRepository.save(errorEntity);
            log.debug("Saved App Error to DB for agent: {}", agentName);
        } catch (Exception e) {
            log.error("Failed to save App Error to DB", e);
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
}
