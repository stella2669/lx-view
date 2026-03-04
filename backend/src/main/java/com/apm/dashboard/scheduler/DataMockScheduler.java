package com.apm.dashboard.scheduler;

import com.apm.dashboard.model.ActiveServiceData;
import com.apm.dashboard.model.TransactionData;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
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
import com.apm.dashboard.model.TopStatsData;
import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.service.TransactionService;

@Slf4j
// @Component // 에이전트 다이렉트 연동으로 인해 가짜(Mock) 데이터 생성 스케줄러 비활성화
public class DataMockScheduler {

    // 웹소켓 메시지 전송을 위한 템플릿 (클라이언트로 실시간 데이터를 푸시할 때 사용)
    private final SimpMessagingTemplate messagingTemplate;
    // 트랜잭션 비즈니스 로직 처리를 위한 서비스 클래스
    private final TransactionService transactionService;
    // 난수(랜덤 값) 생성을 위한 객체 (모의 데이터 생성용)
    private final Random random = new Random();

    // JVM(자바 가상 머신) 상태 관리를 위한 JMX 빈(Bean) 객체들
    // 각각 스레드, 운영체제(CPU), 메모리, 가비지 컬렉터(GC) 정보를 가져옵니다.
    private final ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
    private final OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
    private final MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
    private final List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();

    // 전역 누적 통계 데이터 (동시성 문제를 방지하기 위해 AtomicLong 사용)
    private final AtomicLong totalRequestsCount = new AtomicLong(0); // 총 요청 건수
    private final AtomicLong totalErrorsCount = new AtomicLong(0); // 총 에러 건수
    private int currentTps = 0; // 초당 처리량 (Transactions Per Second)
    private int currentActiveServicesCount = 0; // 현재 활성화된(처리 중인) 서비스 수

    // List of virtual services
    private final List<String> services = Arrays.asList(
            "auth-service", "user-service", "order-service",
            "payment-service", "inventory-service");

    public DataMockScheduler(SimpMessagingTemplate messagingTemplate, TransactionService transactionService) {
        this.messagingTemplate = messagingTemplate;
        this.transactionService = transactionService;
    }

    // 1초(1000ms)마다 주기적으로 실행되는 스케줄러 메서드
    // 프론트엔드로 보내줄 가짜(Mock) 트랜잭션 데이터를 생성합니다.
    @Scheduled(fixedRate = 1000)
    public void generateTransactionData() {
        long currentTimestamp = System.currentTimeMillis(); // 현재 시간(ms)

        // 1초에 10개에서 45개 사이의 랜덤한 개수로 트랜잭션을 생성 (최대 50개 제한)
        int txCount = 10 + random.nextInt(36);
        // 트랜잭션을 담을 리스트 (초기 용량을 지정하여 메모리 재할당 방지)
        List<TransactionData> transactions = new ArrayList<>(txCount + 5);

        int currentSecondErrors = 0; // 이번 1초 동안 발생한 에러 개수

        for (int i = 0; i < txCount; i++) {
            // [응답 시간 생성 로직] 대부분은 빠르게 끝나는 정상 요청, 가끔 지연되는 요청 생성
            int responseTime = generateResponseTime();
            // 5개의 서비스 중 랜덤하게 하나를 선택 (어떤 서비스가 호출되었는지 시뮬레이션)
            String service = services.get(random.nextInt(services.size()));
            // 10%의 확률로 에러를 발생시킴 (화면에서 빨간점(에러)이 잘 보이도록 일부러 높게 설정)
            boolean isError = random.nextDouble() < 0.10;
            // 에러면 500 또는 503, 정상이면 200(대부분) 또는 302 상태 코드 부여
            int statusCode = isError ? (random.nextBoolean() ? 500 : 503) : (random.nextInt(10) == 0 ? 302 : 200);

            if (isError) {
                currentSecondErrors++;
                // 콘솔 로그가 너무 많이 찍히는 것을 방지하기 위해 1/10 확률로만 실제 서버 로그 에러를 출력
                if (random.nextInt(10) == 0)
                    log.error("[Mock Error] Transaction failed in {} with status {}", service, statusCode);
            }

            // 고유 식별자(UUID)를 발급하여 클릭 시 상세 조회가 가능하게 만듦
            String txId = UUID.randomUUID().toString();
            // 리스트에 방금 생성한 Mock 트랜잭션 데이터를 추가
            transactions.add(new TransactionData(txId, currentTimestamp, responseTime, service, isError, statusCode));
        }

        // Delay 트랜잭션은 현재 주석 처리된 상태 (필요 시 주석 해제하여 타임아웃 테스트 가능)
        // Guarantee exactly 5 delayed transactions per second (up to 1 min delay)
        // for (int i = 0; i < 5; i++) {
        // int delayedResponseTime = 30000 + random.nextInt(30000); // 30,000 ~ 60,000ms
        // String service = services.get(random.nextInt(services.size()));
        // boolean isError = random.nextDouble() < 0.10; // 10% error rate for delayed
        // if (isError) {
        // currentSecondErrors++;
        // log.warn("[Mock Timeout] Delayed transaction failed in {}", service);
        // }

        // transactions.add(new TransactionData(currentTimestamp, delayedResponseTime,
        // service, isError));
        // }

        int totalTxThisSecond = txCount + 5;
        this.currentTps = totalTxThisSecond;
        this.totalRequestsCount.addAndGet(totalTxThisSecond);
        this.totalErrorsCount.addAndGet(currentSecondErrors);

        // Add to 5-minute in-memory retention queue
        transactionService.addTransactions(transactions);

        messagingTemplate.convertAndSend("/topic/transactions", transactions);
    }

    // Runs every 1 second for Active Service Counts
    @Scheduled(fixedRate = 1000)
    public void generateActiveServiceData() {
        long currentTimestamp = System.currentTimeMillis();
        List<ActiveServiceData> activeServices = new ArrayList<>();
        int totalActive = 0;

        for (String service : services) {
            // Random active count between 0 to 100 for equalize effect
            int activeCount = random.nextInt(101);
            totalActive += activeCount;
            activeServices.add(new ActiveServiceData(currentTimestamp, service, activeCount));
        }

        this.currentActiveServicesCount = totalActive;
        messagingTemplate.convertAndSend("/topic/active-services", activeServices);

        // Broadcast TopStats
        broadcastTopStats();
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
        // Randomly generate response time up to 6 seconds (6,000 ms)
        return random.nextInt(6000);
    }

    @Scheduled(fixedRate = 1000)
    public void generateJvmMetrics() {
        long currentTimestamp = System.currentTimeMillis();

        // CPU
        double systemCpuLoad = osBean.getCpuLoad();
        double processCpuLoad = osBean.getProcessCpuLoad();

        // Memory
        MemoryUsage heapUsage = memBean.getHeapMemoryUsage();
        long heapUsed = heapUsage.getUsed();
        long heapMax = heapUsage.getMax();
        long heapCommitted = heapUsage.getCommitted();
        double heapUsagePercent = heapMax > 0 ? (double) heapUsed / heapMax * 100.0 : 0.0;

        // GC
        long gcCount = 0;
        long gcTime = 0;
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            long count = gcBean.getCollectionCount();
            if (count != -1)
                gcCount += count;
            long time = gcBean.getCollectionTime();
            if (time != -1)
                gcTime += time;
        }

        // Threads
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
