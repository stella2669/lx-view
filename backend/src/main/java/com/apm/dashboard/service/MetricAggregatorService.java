package com.apm.dashboard.service;

import com.apm.dashboard.model.JvmMetricsData;
import com.apm.dashboard.model.TransactionData;
import com.apm.dashboard.model.entity.AppMetricJvm;
import com.apm.dashboard.model.entity.AppStatRequest;
import com.apm.dashboard.model.entity.AppStatSql;
import com.apm.dashboard.repository.AppMetricJvmRepository;
import com.apm.dashboard.repository.AppStatRequestRepository;
import com.apm.dashboard.repository.AppStatSqlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 에이전트로부터 수신한 메트릭을 인메모리에 누적하고, 1분마다 DB에 집계 저장하는 서비스입니다.
 *
 * <pre>
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  역할별 저장 전략                                                 │
 * │  - JVM         : 최신 스냅샷 1건 보관 → 1분마다 DB 저장          │
 * │  - SQL         : 1분간 건수/시간 누적 → 1분마다 집계 후 DB 저장  │
 * │  - Transaction : 1분간 건수/응답시간 누적 → 1분마다 집계 저장    │
 * └─────────────────────────────────────────────────────────────────┘
 * </pre>
 *
 * 버퍼 내부 카운터는 {@link AtomicLong}으로 thread-safe하게 관리되므로
 * 별도의 synchronized 블록 없이 동시 수신을 안전하게 처리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MetricAggregatorService {

    private final AppIdResolver appIdResolver;
    private final AppMetricJvmRepository appMetricJvmRepository;
    private final AppStatSqlRepository appStatSqlRepository;
    private final AppStatRequestRepository appStatRequestRepository;

    /** JVM 최신 스냅샷 버퍼 (key: agentName) */
    private final ConcurrentHashMap<String, JvmMetricsData> jvmSnapshots = new ConcurrentHashMap<>();

    /** SQL 통계 누적 버퍼 (key: agentName) */
    private final ConcurrentHashMap<String, SqlBuffer> sqlBuffers = new ConcurrentHashMap<>();

    /** HTTP 요청 통계 누적 버퍼 (key: agentName) */
    private final ConcurrentHashMap<String, TxBuffer> txBuffers = new ConcurrentHashMap<>();

    // ────────────────────────────────────────────────────────────────
    // 버퍼 적재 메서드 (MetricSaveService에서 호출)
    // ────────────────────────────────────────────────────────────────

    /**
     * 수신된 JVM 스냅샷을 최신 값으로 갱신합니다.
     * 같은 에이전트에서 데이터가 여러 번 오더라도 최신 1건만 유지됩니다.
     */
    public void bufferJvm(String agentName, JvmMetricsData data) {
        jvmSnapshots.put(agentName, data);
    }

    /**
     * SQL 실행 메트릭을 1분 집계 버퍼에 누적합니다.
     *
     * @param agentName  에이전트 식별 키
     * @param durationMs SQL 실행 소요 시간(ms)
     * @param isError    SQL 에러 여부
     */
    public void bufferSql(String agentName, long durationMs, boolean isError) {
        sqlBuffers.computeIfAbsent(agentName, k -> new SqlBuffer()).add(durationMs, isError);
    }

    /**
     * 트랜잭션(HTTP 요청) 메트릭을 1분 집계 버퍼에 누적합니다.
     *
     * @param agentName 에이전트 식별 키
     * @param tx        파싱된 트랜잭션 데이터
     */
    public void bufferTx(String agentName, TransactionData tx) {
        txBuffers.computeIfAbsent(agentName, k -> new TxBuffer()).add(tx);
    }

    // ────────────────────────────────────────────────────────────────
    // 1분 주기 DB 플러시 (@Scheduled)
    // ────────────────────────────────────────────────────────────────

    /**
     * 1분마다 누적된 모든 버퍼를 DB에 일괄 저장합니다.
     * JVM은 최신 스냅샷, SQL과 TX는 집계 결과를 저장합니다.
     */
    @Scheduled(fixedRate = 60000)
    public void flushAll() {
        LocalDateTime now = LocalDateTime.now();
        log.debug("[Aggregator] Starting periodic flush at {}", now);
        flushJvm(now);
        flushSql(now);
        flushTx(now);
    }

    /** JVM 최신 스냅샷을 에이전트별로 DB에 저장 (버퍼는 유지 — 다음 분에도 저장 필요) */
    private void flushJvm(LocalDateTime now) {
        jvmSnapshots.forEach((agentName, jvm) -> {
            try {
                Long appId = appIdResolver.resolveAppId(agentName);
                if (appId == null) return;
                AppMetricJvm entity = AppMetricJvm.builder()
                        .appId(appId)
                        .recordedAt(now)
                        .processCpuLoad(jvm.getProcessCpuLoad())
                        .systemCpuLoad(jvm.getSystemCpuLoad())
                        .heapUsedMemory(jvm.getHeapUsed())
                        .heapMaxMemory(jvm.getHeapMax())
                        .gcCollectionCount(jvm.getGcCount())
                        .gcCollectionTime(jvm.getGcTimeMs())
                        .liveThreadCount(jvm.getLiveThreads())
                        .deadlockDetected(jvm.getDeadlockedThreads() > 0)
                        .build();
                appMetricJvmRepository.save(entity);
                log.debug("[Aggregator] JVM snapshot saved. agent={}", agentName);
            } catch (Exception e) {
                log.error("[Aggregator] JVM flush failed. agent={}", agentName, e);
            }
        });
    }

    /**
     * SQL 집계 버퍼를 DB에 저장하고 초기화합니다.
     * 버퍼를 먼저 스냅샷으로 복사한 뒤 초기화하여 데이터 유실을 방지합니다.
     */
    private void flushSql(LocalDateTime now) {
        // 현재 버퍼를 원자적으로 교체하여 플러시 중 새로 들어오는 데이터 유실 방지
        Map<String, SqlBuffer> snapshot = new ConcurrentHashMap<>(sqlBuffers);
        sqlBuffers.clear();

        snapshot.forEach((agentName, buffer) -> {
            if (buffer.totalCount.get() == 0) return;
            try {
                Long appId = appIdResolver.resolveAppId(agentName);
                if (appId == null) return;
                AppStatSql entity = AppStatSql.builder()
                        .appId(appId)
                        .baseTime(now)
                        .totalExecutionCount(buffer.totalCount.get())
                        .slowQueryCount(buffer.slowCount.get())
                        .totalExecutionTimeMs(buffer.totalTimeMs.get())
                        .build();
                appStatSqlRepository.save(entity);
                log.debug("[Aggregator] SQL stats saved. agent={}, total={}건, slow={}건",
                        agentName, buffer.totalCount.get(), buffer.slowCount.get());
            } catch (Exception e) {
                log.error("[Aggregator] SQL flush failed. agent={}", agentName, e);
            }
        });
    }

    /**
     * TX 집계 버퍼를 DB에 저장하고 초기화합니다.
     * avgTps는 60초 기준으로 계산합니다.
     */
    private void flushTx(LocalDateTime now) {
        Map<String, TxBuffer> snapshot = new ConcurrentHashMap<>(txBuffers);
        txBuffers.clear();

        snapshot.forEach((agentName, buffer) -> {
            if (buffer.totalRequests.get() == 0) return;
            try {
                Long appId = appIdResolver.resolveAppId(agentName);
                if (appId == null) return;
                long total = buffer.totalRequests.get();
                AppStatRequest entity = AppStatRequest.builder()
                        .appId(appId)
                        .baseTime(now)
                        .totalRequests(total)
                        .errorCount(buffer.errorCount.get())
                        .avgTps(total / 60.0) // 60초 기준 평균 TPS
                        .countUnder1s(buffer.countUnder1s.get())
                        .countUnder3s(buffer.countUnder3s.get())
                        .countUnder5s(buffer.countUnder5s.get())
                        .countOver5s(buffer.countOver5s.get())
                        .status2xx(buffer.status2xx.get())
                        .status3xx(buffer.status3xx.get())
                        .status4xx(buffer.status4xx.get())
                        .status5xx(buffer.status5xx.get())
                        .build();
                appStatRequestRepository.save(entity);
                log.debug("[Aggregator] TX stats saved. agent={}, total={}건, error={}건",
                        agentName, total, buffer.errorCount.get());
            } catch (Exception e) {
                log.error("[Aggregator] TX flush failed. agent={}", agentName, e);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────
    // 내부 버퍼 클래스 (AtomicLong 기반 thread-safe)
    // ────────────────────────────────────────────────────────────────

    /** SQL 실행 통계 누적 버퍼 (1분 단위) */
    static class SqlBuffer {
        final AtomicLong totalCount  = new AtomicLong(0);
        final AtomicLong slowCount   = new AtomicLong(0); // 1,000ms 초과 건수
        final AtomicLong totalTimeMs = new AtomicLong(0);

        void add(long durationMs, boolean isError) {
            totalCount.incrementAndGet();
            totalTimeMs.addAndGet(durationMs);
            // 에러가 아닌 정상 쿼리 중 임계치 초과 시 슬로우쿼리로 집계
            if (!isError && durationMs > 1000) {
                slowCount.incrementAndGet();
            }
        }
    }

    /** HTTP 요청(트랜잭션) 통계 누적 버퍼 (1분 단위) */
    static class TxBuffer {
        final AtomicLong totalRequests = new AtomicLong(0);
        final AtomicLong errorCount    = new AtomicLong(0);
        // 응답 시간 구간 분포
        final AtomicLong countUnder1s  = new AtomicLong(0); // 0 ~ 999ms
        final AtomicLong countUnder3s  = new AtomicLong(0); // 1,000ms ~ 2,999ms
        final AtomicLong countUnder5s  = new AtomicLong(0); // 3,000ms ~ 4,999ms
        final AtomicLong countOver5s   = new AtomicLong(0); // 5,000ms 이상
        // HTTP 상태 코드 분포
        final AtomicLong status2xx     = new AtomicLong(0);
        final AtomicLong status3xx     = new AtomicLong(0);
        final AtomicLong status4xx     = new AtomicLong(0);
        final AtomicLong status5xx     = new AtomicLong(0);

        void add(TransactionData tx) {
            totalRequests.incrementAndGet();
            if (tx.isError()) errorCount.incrementAndGet();

            int rt = tx.getResponseTimeMs();
            if      (rt < 1000) countUnder1s.incrementAndGet();
            else if (rt < 3000) countUnder3s.incrementAndGet();
            else if (rt < 5000) countUnder5s.incrementAndGet();
            else                countOver5s.incrementAndGet();

            int sc = tx.getHttpStatusCode();
            if      (sc >= 200 && sc < 300) status2xx.incrementAndGet();
            else if (sc >= 300 && sc < 400) status3xx.incrementAndGet();
            else if (sc >= 400 && sc < 500) status4xx.incrementAndGet();
            else if (sc >= 500)             status5xx.incrementAndGet();
        }
    }
}
