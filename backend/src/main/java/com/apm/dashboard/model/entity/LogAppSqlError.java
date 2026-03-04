package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_log_app_sql_error")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LogAppSqlError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "app_id", nullable = false)
    private Long appId;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "sql_query", nullable = false, columnDefinition = "TEXT")
    private String sqlQuery;

    @Column(name = "error_code", length = 10)
    private String errorCode;

    @Column(name = "sql_state", length = 5)
    private String sqlState;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "client_ip", length = 64)
    private String clientIp;

    @Builder
    public LogAppSqlError(Long appId, LocalDateTime occurredAt, String sqlQuery,
            String errorCode, String sqlState, String errorMessage,
            Long executionTimeMs, String clientIp) {
        this.appId = appId;
        this.occurredAt = occurredAt;
        this.sqlQuery = sqlQuery;
        this.errorCode = errorCode;
        this.sqlState = sqlState;
        this.errorMessage = errorMessage;
        this.executionTimeMs = executionTimeMs;
        this.clientIp = clientIp;
    }
}
