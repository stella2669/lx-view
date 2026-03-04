package com.apm.dashboard.service;

import com.apm.dashboard.model.TransactionData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class TransactionService {

    private final Queue<TransactionData> transactionQueue = new ConcurrentLinkedQueue<>();
    private static final long RETENTION_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    public void addTransactions(List<TransactionData> transactions) {
        long now = System.currentTimeMillis();
        long threshold = now - RETENTION_PERIOD_MS;

        transactionQueue.addAll(transactions);

        // Evict old data
        while (!transactionQueue.isEmpty() && transactionQueue.peek().getTimestamp() < threshold) {
            transactionQueue.poll();
        }
    }

    public List<TransactionData> getRecentTransactions() {
        return new ArrayList<>(transactionQueue);
    }
}
