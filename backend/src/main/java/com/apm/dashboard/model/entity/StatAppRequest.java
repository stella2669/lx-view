package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_stat_app_request", indexes = {
        @Index(name = "idx_app_stat_req_composite", columnList = "appId, baseTime")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatAppRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appId;

    @Column(nullable = false)
    private LocalDateTime baseTime;

    private Long totalRequests;
    private Long errorCount;
    private Double avgTps;

    private Long countUnder1s;
    private Long countUnder3s;
    private Long countUnder5s;
    private Long countOver5s;

    private Long status2xx;
    private Long status3xx;
    private Long status4xx;
    private Long status5xx;
}