package com.apm.dashboard.service;

import com.apm.dashboard.model.dto.TransactionDetailDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 트랜잭션의 상세 데이터(에러 원인, 스택트레이스, HTTP 상세 등)를 관리하는 서비스입니다.
 * 상세 데이터는 양이 많으므로 DB가 아닌 인메모리(ConcurrentHashMap)에 일정 시간 동안만 보관합니다.
 */
@Slf4j
@Service
public class TransactionDetailService {

    /** 트랜잭션 상세 정보를 담는 인메모리 저장소 (Key: txId) */
    private final Map<String, TransactionDetailDto> detailMap = new ConcurrentHashMap<>();
    
    /** 만료된 데이터를 식별하고 삭제하기 위한 만료 큐 */
    private final Queue<DetailEntry> expiryQueue = new ConcurrentLinkedQueue<>();
    
    /** 데이터 유지 기간 (5분) */
    private static final long RETENTION_PERIOD_MS = 5 * 60 * 1000;

    /**
     * 메트릭 데이터로부터 상세 정보를 추출하여 인메모리에 저장합니다.
     * 일정 시간(5분)이 지난 오래된 데이터는 자동으로 삭제합니다.
     */
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

            // 오래된 데이터 정리
            cleanUp();
        } catch (Exception e) {
            log.warn("Failed to parse ERROR_DETAIL: {}", e.getMessage());
        }
    }

    /**
     * 트랜잭션 ID를 기반으로 상세 정보를 조회합니다.
     */
    public Optional<TransactionDetailDto> getDetail(String txId) {
        return Optional.ofNullable(detailMap.get(txId));
    }

    /** 만료 시간이 지난 상세 데이터를 메모리에서 제거하여 OOM 방지 */
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
