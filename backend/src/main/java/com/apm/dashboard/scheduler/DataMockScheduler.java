package com.apm.dashboard.scheduler;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import com.apm.dashboard.model.ActiveServiceData;
import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.model.TopStatsData;
import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.service.TransactionService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.GarbageCollectorMXBean;
import com.sun.management.OperatingSystemMXBean;
import lombok.extern.slf4j.Slf4j;

@Slf4j
// @Component // 에이전트 다이렉트 연동으로 인해 가짜(Mock) 데이터 생성 스케줄러 비활성화
public class DataMockScheduler {

    private final SimpMessagingTemplate messagingTemplate;
    private final TransactionService transactionService;
    private final Random random = new Random();
    private final DateTimeFormatter txIdFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
    private final OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
    private final MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
    private final List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();

    private final AtomicLong totalRequestsCount = new AtomicLong(0);
    private final AtomicLong totalErrorsCount = new AtomicLong(0);
    private int currentTps = 0;
    private int currentActiveServicesCount = 0;

    private final List<String> services = Arrays.asList(
            "auth-service", "user-service", "order-service",
            "payment-service", "inventory-service");

    public DataMockScheduler(SimpMessagingTemplate messagingTemplate, TransactionService transactionService) {
        this.messagingTemplate = messagingTemplate;
        this.transactionService = transactionService;
    }

    @Scheduled(fixedRate = 1000)
    public void generateTransactionData() {
        long currentTimestamp = System.currentTimeMillis();
        int txCount = 10 + random.nextInt(36);
        List<TransactionData> transactions = new ArrayList<>(txCount + 1);

        int currentSecondErrors = 0;

        for (int i = 0; i < txCount; i++) {
            int responseTime = generateResponseTime();
            String service = services.get(random.nextInt(services.size()));
            boolean isError = random.nextDouble() < 0.10;
            int statusCode = isError ? (random.nextBoolean() ? 500 : 503) : (random.nextInt(10) == 0 ? 302 : 200);

            boolean isHttp = service.startsWith("/api");
            String prefix = isHttp ? "REQ-" : "TX-";
            String datePart = isHttp ? LocalDateTime.now().format(txIdFormatter) + "-" : "";
            String uuidPart = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            String txId = prefix + datePart + uuidPart;
            if (isError) {
                currentSecondErrors++;
                sendErrorDetail(txId, currentTimestamp, service);
            }
            transactions.add(new TransactionData(txId, currentTimestamp, responseTime, service, isError, statusCode));
        }

        this.currentTps = txCount;
        this.totalRequestsCount.addAndGet(txCount);
        this.totalErrorsCount.addAndGet(currentSecondErrors);

        transactionService.addTransactions(transactions);
        messagingTemplate.convertAndSend("/topic/transactions", transactions);
    }

    @Scheduled(fixedRate = 1000)
    public void generateActiveServiceData() {
        long currentTimestamp = System.currentTimeMillis();
        List<ActiveServiceData> activeServices = new ArrayList<>();
        int totalActive = 0;

        for (String service : services) {
            int activeCount = random.nextInt(101);
            totalActive += activeCount;
            activeServices.add(new ActiveServiceData(currentTimestamp, service, activeCount));
        }

        this.currentActiveServicesCount = totalActive;
        messagingTemplate.convertAndSend("/topic/active-services", activeServices);
        broadcastTopStats();
    }

    private void sendErrorDetail(String txId, long timestamp, String service) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("txId", txId);
        detail.put("timestamp", timestamp);
        detail.put("service", service);
        messagingTemplate.convertAndSend("/topic/error-detail", detail);
    }

    private void broadcastTopStats() {
        TopStatsData stats = new TopStatsData(
                this.currentActiveServicesCount,
                this.totalRequestsCount.get(),
                this.totalErrorsCount.get(),
                this.currentTps,
                this.threadMXBean.getThreadCount());
        messagingTemplate.convertAndSend("/topic/top-stats", stats);
    }

    private int generateResponseTime() {
        return random.nextInt(6000);
    }

    @Scheduled(fixedRate = 1000)
    public void generateJvmMetrics() {
        long currentTimestamp = System.currentTimeMillis();
        double systemCpuLoad = osBean.getCpuLoad();
        double processCpuLoad = osBean.getProcessCpuLoad();
        MemoryUsage heapUsage = memBean.getHeapMemoryUsage();
        long heapUsed = heapUsage.getUsed();
        long heapMax = heapUsage.getMax();
        long heapCommitted = heapUsage.getCommitted();
        double heapUsagePercent = heapMax > 0 ? (double) heapUsed / heapMax * 100.0 : 0.0;

        long gcCount = 0;
        long gcTime = 0;
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            long count = gcBean.getCollectionCount();
            if (count != -1) gcCount += count;
            long time = gcBean.getCollectionTime();
            if (time != -1) gcTime += time;
        }

        int liveThreads = threadMXBean.getThreadCount();
        long[] deadlockedIds = threadMXBean.findDeadlockedThreads();
        int deadlockedThreads = deadlockedIds != null ? deadlockedIds.length : 0;

        JvmMetricsData metrics = new JvmMetricsData(
                currentTimestamp,
                processCpuLoad,
                systemCpuLoad,
                heapUsed,
                heapMax,
                heapCommitted,
                heapUsagePercent,
                gcCount,
                gcTime,
                liveThreads,
                deadlockedThreads);

        messagingTemplate.convertAndSend("/topic/jvm-metrics", metrics);
    }
}
