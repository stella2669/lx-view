package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_log_app_slow_query", indexes = {
        @Index(name = "idx_app_sq_composite", columnList = "appId, executedAt")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogAppSlowQuery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appId;

    @Column(nullable = false)
    private LocalDateTime executedAt;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String sqlQuery;

    private Long executionTimeMs;
    private String clientIp;
    private String executingThread;
}