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

@Service
public class TransactionService {

    private final Queue<TransactionData> transactionQueue = new ConcurrentLinkedQueue<>();
    private final Map<String, TransactionData> transactionMap = new ConcurrentHashMap<>();
    private static final long RETENTION_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    public void addTransactions(List<TransactionData> transactions) {
        long now = System.currentTimeMillis();
        long threshold = now - RETENTION_PERIOD_MS;

        for (TransactionData tx : transactions) {
            transactionQueue.add(tx);
            transactionMap.put(tx.getId(), tx);
        }

        // Evict old data
        while (!transactionQueue.isEmpty() && transactionQueue.peek().getTimestamp() < threshold) {
            TransactionData oldTx = transactionQueue.poll();
            if (oldTx != null) {
                transactionMap.remove(oldTx.getId());
            }
        }
    }

    public List<TransactionData> getRecentTransactions() {
        return new ArrayList<>(transactionQueue);
    }

    public Optional<TransactionData> findById(String txId) {
        return Optional.ofNullable(transactionMap.get(txId));
    }
}
