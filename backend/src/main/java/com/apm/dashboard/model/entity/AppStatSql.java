package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "apm_app_stat_sql", indexes = {
        @Index(name = "idx_stat_app_sql_composite", columnList = "appId, baseTime")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppStatSql {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appId;

    @Column(nullable = false)
    private LocalDateTime baseTime;

    private Long totalExecutionCount; // 해당 주기의 총 쿼리 실행 횟수
    private Long slowQueryCount; // 기준치(예: 1초)를 넘긴 슬로우 쿼리 횟수
    private Long totalExecutionTimeMs; // 해당 주기의 모든 쿼리 소요 시간 합계
}