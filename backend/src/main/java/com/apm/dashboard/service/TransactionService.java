package com.apm.dashboard.service;

import com.apm.dashboard.model.TransactionData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 실시간 트랜잭션 수집 및 대시보드 용 데이터 보관을 담당하는 서비스입니다.
 * 수신된 트랜잭션 데이터를 인메모리 큐에 적재하며, 최근 5분간의 데이터만 선입선출(FIFO) 방식으로 유지합니다.
 */
@Service
public class TransactionService {

    /** 실시간 차트에 노출할 트랜잭션 로직을 보관하는 큐 */
    private final Queue<TransactionData> transactionQueue = new ConcurrentLinkedQueue<>();
    
    /** 신속한 단건 조회를 위한 캐시 맵 */
    private final Map<String, TransactionData> transactionMap = new ConcurrentHashMap<>();
    
    /** 실시간성이 중요한 데이터이므로 최대 5분만 보관 */
    private static final long RETENTION_PERIOD_MS = 5 * 60 * 1000;

    /**
     * 에이전트로부터 전달받은 신규 트랜잭션 리스트를 저장소에 추가합니다.
     * 중복 ID가 유입될 경우, 더 긴 소요 시간을 가진 데이터를 최신본으로 업데이트합니다.
     * @param transactions 에이전트가 수집한 트랜잭션 목록
     */
    public void addTransactions(List<TransactionData> transactions) {
        long now = System.currentTimeMillis();
        long threshold = now - RETENTION_PERIOD_MS;

        for (TransactionData tx : transactions) {
            TransactionData existing = transactionMap.get(tx.getId());
            
            if (existing != null) {
                // 동일한 중복 요청이 있을 경우, 더 신뢰도 높은(소요시간이 더 긴) 쪽을 보존
                boolean mergedError = existing.isError() || tx.isError();
                
                if (tx.getResponseTimeMs() > existing.getResponseTimeMs()) {
                    tx.setError(mergedError);
                    transactionMap.put(tx.getId(), tx);
                } else {
                    existing.setError(mergedError);
                    transactionMap.put(tx.getId(), existing);
                }
            } else {
                transactionQueue.add(tx);
                transactionMap.put(tx.getId(), tx);
            }
        }

        // 5분 경과 데이터는 큐와 맵에서 자동 제거
        while (!transactionQueue.isEmpty() && transactionQueue.peek().getTimestamp() < threshold) {
            TransactionData oldTx = transactionQueue.poll();
            if (oldTx != null) {
                transactionMap.remove(oldTx.getId());
            }
        }
    }

    /** 대시보드 X-View 차트 구성을 위해 최근 보관 중인 모든 트랜잭션을 반환합니다. */
    public List<TransactionData> getRecentTransactions() {
        return new ArrayList<>(transactionMap.values());
    }

    /** 특정 트랜잭션 ID를 기반으로 요약 정보를 조회합니다. */
    public Optional<TransactionData> findById(String txId) {
        return Optional.ofNullable(transactionMap.get(txId));
    }
}
