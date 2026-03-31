package com.apm.dashboard.service;

import com.apm.dashboard.model.entity.LogAppSlowQuery;
import com.apm.dashboard.model.entity.StatAppSql;
import com.apm.dashboard.repository.AppInfoRepository;
import com.apm.dashboard.repository.LogAppSlowQueryRepository;
import com.apm.dashboard.repository.StatAppSqlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Async;

/**
 * 수집된 SQL 실행 통계 및 슬로우 쿼리 로그를 관리하는 서비스입니다.
 * 대시보드 조회를 위한 통계 추출 기능과 통계 데이터 적재 기능을 제공합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SqlMonitoringService {

    private final AppInfoRepository appInfoRepository;
    private final StatAppSqlRepository statAppSqlRepository;
    private final LogAppSlowQueryRepository logAppSlowQueryRepository;

    /** 중복된 슬로우 쿼리 로깅 방지를 위한 버퍼 */
    private final ConcurrentHashMap<String, Long> deduplicationBuffer = new ConcurrentHashMap<>();
    private static final long DEDUPLICATION_WINDOW_MS = 10000;

    /**
     * 특정 앱의 SQL 실행 건수 및 소요 시간 통계 목록을 조회합니다. (차트용)
     */
    @Transactional(readOnly = true)
    public List<StatAppSql> getSqlStats(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);
        return statAppSqlRepository.findByAppIdAndBaseTimeBetweenOrderByBaseTimeAsc(appId, startTime, endTime);
    }

    /**
     * 소요 시간이 긴 상위 50개의 슬로우 쿼리 이력을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<LogAppSlowQuery> getTopSlowQueries(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);
        return logAppSlowQueryRepository.findTop50ByAppIdAndExecutedAtBetweenOrderByExecutionTimeMsDesc(appId, startTime, endTime);
    }

    /**
     * 최근 발생한 시간순 슬로우 쿼리 이력을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<LogAppSlowQuery> getRecentSlowQueries(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);
        return logAppSlowQueryRepository.findTop50ByAppIdAndExecutedAtBetweenOrderByExecutedAtDesc(appId, startTime, endTime);
    }

    /**
     * 임계시간(예: 1초)을 초과한 슬로우 쿼리 정보를 DB에 비동기로 저장합니다.
     * 동일 쿼리에 대해 10초 이내 중복 저장을 방지합니다.
     */
    @Async
    public void saveSlowQueryLogSafely(String appKey, String sql, long elapsedMs, String traceId) {
        try {
            // 1. 중복 체크
            String hashKey = appKey + "_" + sql.hashCode();
            long now = System.currentTimeMillis();
            Long lastLogged = deduplicationBuffer.get(hashKey);

            if (lastLogged != null && (now - lastLogged) < DEDUPLICATION_WINDOW_MS) {
                log.debug("[SQL Monitoring] Suppressed duplicate slow query logging for: {}", hashKey);
                return;
            }
            deduplicationBuffer.put(hashKey, now);

            // 2. AppId 매핑
            Optional<com.apm.dashboard.model.entity.AppInfo> appInfoOpt = appInfoRepository.findByAppKey(appKey);
            Long mappedAppId = appInfoOpt.map(com.apm.dashboard.model.entity.AppInfo::getId).orElse(1L);

            // 3. 로그 저장
            LogAppSlowQuery slowQueryLog = LogAppSlowQuery.builder()
                    .appId(mappedAppId)
                    .executedAt(LocalDateTime.now())
                    .sqlQuery(sql)
                    .executionTimeMs(elapsedMs)
                    .build();

            logAppSlowQueryRepository.save(slowQueryLog);
            log.info("[SQL Monitoring] Async Slow Query Log Saved. AppId: {}, TraceId: {}", mappedAppId, traceId);

        } catch (Exception e) {
            log.error("[SQL Monitoring] Failed to async save slow query log.", e);
        }
    }
}
