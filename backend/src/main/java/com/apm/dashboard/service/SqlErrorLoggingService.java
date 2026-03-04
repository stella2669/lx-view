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

@Slf4j
@Service
@RequiredArgsConstructor
public class SqlErrorLoggingService {

    private final AppInfoRepository appInfoRepository;
    private final LogAppSqlErrorRepository logAppSqlErrorRepository;

    // 중복 방지를 위한 인메모리 버퍼 (Key: appKey_sqlHash, Value: Timestamp)
    private final ConcurrentHashMap<String, Long> deduplicationBuffer = new ConcurrentHashMap<>();
    private static final long DEDUPLICATION_WINDOW_MS = 10000; // 10초

    @Async
    public void saveErrorLogSafely(String appKey, String sql, long elapsedMs, String traceId) {
        try {
            // 1. De-duplication Check (해시 기반 중복 로깅 방어)
            String hashKey = appKey + "_" + sql.hashCode();
            long now = System.currentTimeMillis();
            Long lastLogged = deduplicationBuffer.get(hashKey);

            if (lastLogged != null && (now - lastLogged) < DEDUPLICATION_WINDOW_MS) {
                log.debug("[SQL Monitoring] Suppressed duplicate SQL error logging for: {}", hashKey);
                return;
            }

            // 버퍼 업데이트 (10초 타임스탬프 갱신)
            deduplicationBuffer.put(hashKey, now);

            // 2. AppKey to AppId Mapping
            Optional<AppInfo> appInfoOpt = appInfoRepository.findByAppKey(appKey);
            Long mappedAppId = appInfoOpt.map(AppInfo::getId).orElse(1L); // Fallback to 1 if unknown

            // 3. Build & Save Entity
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
            // 절대 외부로 예외가 전파되지 않도록 완벽 방어
            log.error("[SQL Monitoring] Failed to async save SQL error log via SqlErrorLoggingService.", e);
        }
    }
}
