package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_log_app_error", indexes = {
        @Index(name = "idx_app_error_composite", columnList = "appId, occurredAt")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogAppError {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appId; // 대상 앱 식별 ID

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Column(nullable = false)
    private String exceptionName;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(columnDefinition = "LONGTEXT")
    private String stackTrace;

    private String requestUrl;
    private String httpMethod;
    private String clientIp;

    @Column(columnDefinition = "TEXT")
    private String requestParams;

    @Column(columnDefinition = "LONGTEXT")
    private String requestBody;

    private String threadName;
}