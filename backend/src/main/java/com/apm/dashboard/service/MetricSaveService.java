package com.apm.dashboard.service;

import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.model.TransactionData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MetricSaveService {

    private final SimpMessagingTemplate messagingTemplate;
    private final TransactionService transactionService;

    /**
     * 에이전트로부터 수신한 메트릭 배치 데이터를 비동기적으로 처리하고 매핑합니다.
     * 자체 스레드풀에서 동작하여, Controller의 HTTP 응답을 지연시키지 않습니다.
     * 
     * @param metrics 수신한 원시(Raw) JSON 기반 Map 형태 메트릭 리스트
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

                // [Parsing] 수신된 메트릭의 종류(type)에 따라 파싱 및 객체 매핑
                if ("TRANSACTION".equalsIgnoreCase(type)) {
                    TransactionData txData = parseTransactionData(metric);
                    if (txData != null) {
                        transactions.add(txData);
                    }
                } else if ("JVM".equalsIgnoreCase(type)) {
                    JvmMetricsData jvmData = parseJvmMetricsData(metric);
                    if (jvmData != null) {
                        jvmMetrics.add(jvmData);
                    }
                }
            }

            // [Broadcast & Save] 파싱된 트랜잭션 데이터를 인메모리에 저장하고 프론트엔드로 웹소켓 푸시
            if (!transactions.isEmpty()) {
                transactionService.addTransactions(transactions);
                messagingTemplate.convertAndSend("/topic/transactions", transactions);
            }

            // [Broadcast] 파싱된 JVM 메트릭 브로드캐스트 (최신 1건 발송 기준)
            if (!jvmMetrics.isEmpty()) {
                messagingTemplate.convertAndSend("/topic/jvm-metrics", jvmMetrics.get(jvmMetrics.size() - 1));
            }

            if (log.isInfoEnabled()) {
                log.info("Successfully processed and mapped {} metrics in {} ms", metrics.size(),
                        (System.currentTimeMillis() - startTime));
            }

        } catch (Exception e) {
            // [Defensive] 비동기 워커 스레드 내부에서의 에러가 다른 실행에 영향을 주지 않도록 로깅 후 예외 삼킴(Swallow)
            log.error("[MetricSaveService] Failed to parse and save asynchronous metrics.", e);
        }
    }

    /**
     * Map 형태의 데이터를 TransactionData 객체로 안전하게 매핑 (Type Casting 방어)
     */
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

    /**
     * Map 형태의 데이터를 JvmMetricsData 객체로 안전하게 매핑 (Type Casting 방어)
     */
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

    // --- Type Casting 방어 메서드 모음 (Defensive helper methods) ---
    private long getLongValue(Map<String, Object> map, String key, long defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number)
            return ((Number) val).longValue();
        if (val instanceof String)
            return Long.parseLong((String) val);
        return defaultValue;
    }

    private int getIntValue(Map<String, Object> map, String key, int defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number)
            return ((Number) val).intValue();
        if (val instanceof String)
            return Integer.parseInt((String) val);
        return defaultValue;
    }

    private double getDoubleValue(Map<String, Object> map, String key, double defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number)
            return ((Number) val).doubleValue();
        if (val instanceof String)
            return Double.parseDouble((String) val);
        return defaultValue;
    }

    private boolean getBooleanValue(Map<String, Object> map, String key, boolean defaultValue) {
        Object val = map.get(key);
        if (val instanceof Boolean)
            return (Boolean) val;
        if (val instanceof String)
            return Boolean.parseBoolean((String) val);
        return defaultValue;
    }
}
