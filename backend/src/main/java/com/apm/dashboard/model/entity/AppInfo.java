package com.apm.dashboard.model.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "apm_app_info")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String appKey; // 예: "PAYMENT-SERVICE"

    private String appName; // 대시보드 표시용 이름
    private String appType; // 예: "SPRING_BOOT"
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true; // 사용 여부 (N일 경우 메트릭 ड्रॉप)
}
