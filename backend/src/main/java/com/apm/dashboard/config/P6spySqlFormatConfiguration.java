package com.apm.dashboard.config;

import com.p6spy.engine.logging.Category;
import com.p6spy.engine.spy.appender.MessageFormattingStrategy;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.engine.jdbc.internal.FormatStyle;
import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Configuration
public class P6spySqlFormatConfiguration implements MessageFormattingStrategy {

    // 1. 비동기 처리를 위한 전용 스레드 풀
    private final ExecutorService asyncLoggingExecutor = Executors.newFixedThreadPool(2);

    // 2. 정상 쿼리의 통계 누적을 위한 메모리 저장소 보일러플레이트
    private final ConcurrentHashMap<String, SqlStatInfo> statMap = new ConcurrentHashMap<>();

    @Override
    public String formatMessage(int connectionId, String now, long elapsed, String category, String prepared,
            String sql, String url) {
        if (!StringUtils.hasText(sql)) {
            return ""; // Connection open/close 등 로깅 제외
        }

        // 현재 스레드의 MDC 설정값에서 TraceId 추출 (WebFlux의 경우 Context에서, MVC의 경우 MDC에서 뽑아옴)
        String traceId = MDC.get("traceId");
        if (!StringUtils.hasText(traceId)) {
            traceId = "UNKNOWN";
        }

        final String finalTraceId = traceId;
        final String rawSql = formatSql(category, sql);
        final boolean isError = Category.ERROR.getName().equals(category);

        // 3. 비동기 워커로 로깅 로직 이관 (메인 스레드 블로킹 해제)
        asyncLoggingExecutor.submit(() -> {
            // 4. 로직 분기 (샘플링)
            if (isError || elapsed >= 1000) {
                // [슬로우 쿼리 or 에러 쿼리] -> DB 즉시 저장 로직 호출
                saveSlowOrErrorQuery(finalTraceId, rawSql, elapsed, isError);
            } else {
                // [정상 쿼리] -> 메모리 집계
                aggregateStatMetrics(rawSql, elapsed);
            }
        });

        // 콘솔 혹은 기본 애플리케이션 로그에 찍힐 포맷 정의 (ERROR이거나 SLOW일 때만 콘솔에 출력)
        if (isError || elapsed >= 1000) {
            return String.format("[%s] %dms | TraceId: %s | %s",
                    isError ? "ERROR" : "SLOW",
                    elapsed,
                    finalTraceId,
                    rawSql);
        }

        return ""; // 정상 쿼리는 콘솔에 로그를 남기지 않음
    }

    private String formatSql(String category, String sql) {
        if (sql == null || sql.trim().isEmpty())
            return sql;
        String tmpsql = sql.trim().toLowerCase(Locale.ROOT);

        // Hibernate Formatting (DDL or DML)
        if (tmpsql.startsWith("create") || tmpsql.startsWith("alter") || tmpsql.startsWith("comment")) {
            return FormatStyle.DDL.getFormatter().format(sql);
        } else {
            return FormatStyle.BASIC.getFormatter().format(sql);
        }
    }

    private void saveSlowOrErrorQuery(String traceId, String sql, long elapsedMs, boolean isError) {
        String status = isError ? "ERROR" : "SLOW";
        log.warn("[{}] SQL Captured ({}ms) - TraceId: {}\n{}", status, elapsedMs, traceId, sql);

        try {
            if (isError) {
                org.springframework.context.ApplicationContext context = com.apm.dashboard.config.ApplicationContextProvider
                        .getContext();
                if (context != null) {
                    // 환경변수에서 현재 앱의 키를 가져옵니다 (기본값: UNKNOWN-APP)
                    String appKey = context.getEnvironment().getProperty("apm.agent.app-key", "PAYMENT-SERVICE");

                    com.apm.dashboard.service.SqlErrorLoggingService errorService = context
                            .getBean(com.apm.dashboard.service.SqlErrorLoggingService.class);

                    // 비동기 서비스 호출 (try-catch, 중복제거 내장)
                    errorService.saveErrorLogSafely(appKey, sql, elapsedMs, traceId);
                }
            } else {
                // Ignore slow query logic here (already handled separately or in the same way)
            }
        } catch (Exception e) {
            // P6Spy 인터셉터 최상위 방어벽
            log.error("Failed to route SQL Error Log to Async Service", e);
        }
    }

    private void aggregateStatMetrics(String sql, long timeMs) {
        statMap.compute(sql, (k, v) -> {
            if (v == null) {
                return new SqlStatInfo(1, timeMs, timeMs);
            }
            v.increment(timeMs);
            return v;
        });
    }

    @PreDestroy
    public void destroy() {
        asyncLoggingExecutor.shutdown();
    }

    // 간단한 통계용 DTO (내부 클래스)
    public static class SqlStatInfo {
        private long count;
        private long totalTimeMs;
        private long maxTimeMs;

        public SqlStatInfo(long count, long totalTimeMs, long maxTimeMs) {
            this.count = count;
            this.totalTimeMs = totalTimeMs;
            this.maxTimeMs = maxTimeMs;
        }

        public synchronized void increment(long timeMs) {
            this.count++;
            this.totalTimeMs += timeMs;
            if (timeMs > this.maxTimeMs) {
                this.maxTimeMs = timeMs;
            }
        }
    }
}
