package com.apm.dashboard.model.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "apm_log_sys_internal", indexes = {
        @Index(name = "idx_sys_log_time", columnList = "occurredAt, logLevel")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogSysInternal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    private String logLevel; // INFO, WARN, ERROR
    private String loggerName;
    private String message;

    @Column(columnDefinition = "LONGTEXT")
    private String stackTrace;
}
