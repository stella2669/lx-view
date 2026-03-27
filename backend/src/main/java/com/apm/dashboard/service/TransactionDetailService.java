package com.apm.dashboard.service;

import com.apm.dashboard.model.dto.TransactionDetailDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Slf4j
@Service
public class TransactionDetailService {

    private final Map<String, TransactionDetailDto> detailMap = new ConcurrentHashMap<>();
    private final Queue<DetailEntry> expiryQueue = new ConcurrentLinkedQueue<>();
    private static final long RETENTION_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    public void saveDetail(Map<String, Object> raw) {
        try {
            String txId = raw.get("txId").toString();
            TransactionDetailDto detail = TransactionDetailDto.builder()
                    .txId(txId)
                    .exceptionName(getString(raw, "exceptionName"))
                    .errorMessage(getString(raw, "errorMessage"))
                    .stackTrace(getString(raw, "stackTrace"))
                    .httpMethod(getString(raw, "httpMethod"))
                    .requestUrl(getString(raw, "requestUrl"))
                    .requestParams(getString(raw, "requestParams"))
                    .requestBody(getString(raw, "requestBody"))
                    .threadName(getString(raw, "threadName"))
                    .build();

            detailMap.put(txId, detail);
            expiryQueue.add(new DetailEntry(txId, System.currentTimeMillis()));

            cleanUp();
        } catch (Exception e) {
            log.warn("Failed to parse ERROR_DETAIL: {}", e.getMessage());
        }
    }

    public Optional<TransactionDetailDto> getDetail(String txId) {
        return Optional.ofNullable(detailMap.get(txId));
    }

    private void cleanUp() {
        long threshold = System.currentTimeMillis() - RETENTION_PERIOD_MS;
        while (!expiryQueue.isEmpty() && expiryQueue.peek().timestamp < threshold) {
            DetailEntry expired = expiryQueue.poll();
            if (expired != null) {
                detailMap.remove(expired.txId);
            }
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private record DetailEntry(String txId, long timestamp) {}
}
