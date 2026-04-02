package com.apm.dashboard.service;

import com.apm.dashboard.model.entity.AppIncidentLog;
import com.apm.dashboard.model.entity.IncidentType;
import com.apm.dashboard.repository.AppIncidentLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SQL 슬로우쿼리 및 SQL 에러 로그를 AppIncidentLog 단일 테이블을 통해 관리하는 서비스입니다.
 * - SLOW_QUERY: 임계시간을 초과한 SQL (saveSlowQueryLogSafely)
 * - SQL_ERROR : SQL 실행 중 발생한 DB 에러 (saveSqlErrorSafely)
 * 두 메서드 모두 비동기 처리 및 10초 중복 제거(Deduplication)를 지원합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SqlMonitoringService {

    private final AppIdResolver appIdResolver;
    private final AppIncidentLogRepository appIncidentLogRepository;
    private final com.apm.dashboard.repository.AppStatSqlRepository appStatSqlRepository;

    /** 중복된 SQL 로깅 방지를 위한 버퍼 (Key: appKey + sqlHash) */
    private final ConcurrentHashMap<String, Long> deduplicationBuffer = new ConcurrentHashMap<>();
    private static final long DEDUPLICATION_WINDOW_MS = 10000;

    // ────────────────────────────────────────────────────────────────
    // 조회 메서드
    // ────────────────────────────────────────────────────────────────

    /**
     * 특정 앱의 SQL 실행 시간이 긴 상위 50개 슬로우쿼리를 조회합니다. (Top Slow Queries 차트용)
     */
    @Transactional(readOnly = true)
    public List<AppIncidentLog> getTopSlowQueries(Long appId, int minutesParam) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutesParam);
        return appIncidentLogRepository
                .findTop50ByAppIdAndIncidentTypeAndOccurredAtBetweenOrderByExecutionTimeMsDesc(
                        appId, IncidentType.SLOW_QUERY, start, end);
    }

    /**
     * 특정 앱의 최근 슬로우쿼리를 최신순으로 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<AppIncidentLog> getRecentSlowQueries(Long appId, int minutesParam) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutesParam);
        return appIncidentLogRepository
                .findTop50ByAppIdAndIncidentTypeAndOccurredAtBetweenOrderByOccurredAtDesc(
                        appId, IncidentType.SLOW_QUERY, start, end);
    }

    /**
     * 특정 앱의 일정 기간 동안의 SQL 성능 통계(AppStatSql)를 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<com.apm.dashboard.model.entity.AppStatSql> getSqlStats(Long appId, int minutesParam) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutesParam);
        return appStatSqlRepository.findByAppIdAndBaseTimeBetweenOrderByBaseTimeAsc(appId, start, end);
    }

    // ────────────────────────────────────────────────────────────────
    // 적재 메서드 (비동기, 중복 방지)
    // ────────────────────────────────────────────────────────────────

    /**
     * 임계시간을 초과한 슬로우쿼리를 AppIncidentLog(SLOW_QUERY 타입)에 비동기로 저장합니다.
     * 동일 쿼리에 대해 10초 이내 중복 저장을 방지합니다.
     */
    @Async
    public void saveSlowQueryLogSafely(String appKey, String sql, long elapsedMs, String traceId) {
        if (!passDeduplicate(appKey, sql)) return;

        try {
            Long mappedAppId = appIdResolver.resolveAppId(appKey);

            AppIncidentLog incident = AppIncidentLog.builder()
                    .appId(mappedAppId)
                    .incidentType(IncidentType.SLOW_QUERY)
                    .occurredAt(LocalDateTime.now())
                    .sqlQuery(sql)
                    .executionTimeMs(elapsedMs)
                    .message("Slow query detected. TraceId: " + traceId)
                    .build();

            appIncidentLogRepository.save(incident);
            log.info("[SQL] SLOW_QUERY saved. AppId: {}, TraceId: {}, {}ms",
                    mappedAppId, traceId, elapsedMs);

        } catch (Exception e) {
            log.error("[SQL] Failed to save SLOW_QUERY incident.", e);
        }
    }

    /**
     * SQL 실행 에러를 AppIncidentLog(SQL_ERROR 타입)에 비동기로 저장합니다.
     * 동일 쿼리에 대해 10초 이내 중복 저장을 방지합니다.
     */
    @Async
    public void saveSqlErrorSafely(String appKey, String sql, long elapsedMs, String traceId) {
        if (!passDeduplicate(appKey, sql)) return;

        try {
            Long mappedAppId = appIdResolver.resolveAppId(appKey);

            AppIncidentLog incident = AppIncidentLog.builder()
                    .appId(mappedAppId)
                    .incidentType(IncidentType.SQL_ERROR)
                    .occurredAt(LocalDateTime.now())
                    .sqlQuery(sql)
                    .executionTimeMs(elapsedMs)
                    .message("SQL execution error caught. TraceId: " + traceId)
                    .build();

            appIncidentLogRepository.save(incident);
            log.info("[SQL] SQL_ERROR saved. AppId: {}, TraceId: {}",
                    mappedAppId, traceId);

        } catch (Exception e) {
            log.error("[SQL] Failed to save SQL_ERROR incident.", e);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // 내부 헬퍼
    // ────────────────────────────────────────────────────────────────

    /** 10초 이내 동일 쿼리 중복 여부 확인. true면 저장 진행, false면 건너뜀. */
    private boolean passDeduplicate(String appKey, String sql) {
        String hashKey = appKey + "_" + sql.hashCode();
        long now = System.currentTimeMillis();
        Long lastLogged = deduplicationBuffer.get(hashKey);

        if (lastLogged != null && (now - lastLogged) < DEDUPLICATION_WINDOW_MS) {
            log.debug("[SQL] Suppressed duplicate logging for: {}", hashKey);
            return false;
        }
        deduplicationBuffer.put(hashKey, now);
        return true;
    }

    /**
     * OOM 방지: 1분마다 실행되어 만료된 (10초 지난) Deduplication 버퍼 항목을 정리합니다.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void cleanupDeduplicationBuffer() {
        long now = System.currentTimeMillis();
        int initialSize = deduplicationBuffer.size();
        deduplicationBuffer.entrySet().removeIf(entry -> (now - entry.getValue()) > DEDUPLICATION_WINDOW_MS);
        int finalSize = deduplicationBuffer.size();
        
        if (initialSize != finalSize && log.isDebugEnabled()) {
            log.debug("Cleaned up {} expired items from SQL deduplicationBuffer", (initialSize - finalSize));
        }
    }
}
