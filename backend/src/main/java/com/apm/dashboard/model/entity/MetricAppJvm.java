package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_metric_app_jvm", indexes = {
        @Index(name = "idx_app_metric_composite", columnList = "appId, recordedAt")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricAppJvm {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appId;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    private Double processCpuLoad;
    private Double systemCpuLoad;
    private Long heapUsedMemory;
    private Long heapMaxMemory;
    private Long gcCollectionCount;
    private Long gcCollectionTime;
    private Integer liveThreadCount;
    private Boolean deadlockDetected;
}
