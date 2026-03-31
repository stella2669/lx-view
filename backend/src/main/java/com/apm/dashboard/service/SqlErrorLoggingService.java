package com.apm.dashboard.service;

import com.apm.dashboard.model.entity.AppInfo;
import com.apm.dashboard.model.entity.LogAppSqlError;
import com.apm.dashboard.repository.AppInfoRepository;
import com.apm.dashboard.repository.LogAppSqlErrorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 실행 중 실패한 SQL 쿼리에 대한 에러 로그를 기록하는 서비스입니다.
 * 비동기 처리를 지원하며, 동일한 쿼리에 대한 반복적인 로깅을 방지하기 위한 중복 제거(Deduplication) 기능을 포함합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SqlErrorLoggingService {

    private final AppInfoRepository appInfoRepository;
    private final LogAppSqlErrorRepository logAppSqlErrorRepository;

    /** 중복 로깅 방지를 위한 인메모리 버퍼 (Key: appKey + sqlHash) */
    private final ConcurrentHashMap<String, Long> deduplicationBuffer = new ConcurrentHashMap<>();
    private static final long DEDUPLICATION_WINDOW_MS = 10000; // 10초 동안 중복 무시

    /**
     * SQL 에러 내역을 DB에 비동기로 저장합니다.
     * 10초 이내에 동일한 쿼리가 반복될 경우 디스크 I/O를 줄이기 위해 로깅을 건너뜁니다.
     * 
     * @param appKey 에이전트 식별 키
     * @param sql 실행 실패한 SQL 구문
     * @param elapsedMs 실행에 소요되었던 시간(ms)
     * @param traceId 트랜잭션 추적 ID
     */
    @Async
    public void saveErrorLogSafely(String appKey, String sql, long elapsedMs, String traceId) {
        try {
            // 1. 중복 체크 (Deduplication)
            String hashKey = appKey + "_" + sql.hashCode();
            long now = System.currentTimeMillis();
            Long lastLogged = deduplicationBuffer.get(hashKey);

            if (lastLogged != null && (now - lastLogged) < DEDUPLICATION_WINDOW_MS) {
                log.debug("[SQL Monitoring] Suppressed duplicate SQL error logging for: {}", hashKey);
                return;
            }

            // 버퍼 업데이트 (최신 타임스탬프 기록)
            deduplicationBuffer.put(hashKey, now);

            // 2. 에이전트 식별자를 통한 AppId 매핑
            Optional<AppInfo> appInfoOpt = appInfoRepository.findByAppKey(appKey);
            Long mappedAppId = appInfoOpt.map(AppInfo::getId).orElse(1L);

            // 3. 엔티티 생성 및 DB 저장
            LogAppSqlError errorLog = LogAppSqlError.builder()
                    .appId(mappedAppId)
                    .occurredAt(LocalDateTime.now())
                    .sqlQuery(sql)
                    .executionTimeMs(elapsedMs)
                    .errorMessage("SQL Execution Error Caught. TraceId: " + traceId)
                    .build();

            logAppSqlErrorRepository.save(errorLog);
            log.info("[SQL Monitoring] Async SQL Error Log Saved. AppId: {}, TraceId: {}", mappedAppId, traceId);

        } catch (Exception e) {
            // 비동기 처리 중 오류가 타겟 애플리케이션의 본래 로직에 영향을 주지 않도록 완벽 보완
            log.error("[SQL Monitoring] Failed to async save SQL error log.", e);
        }
    }
}
