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

    @Column(name = "app_key", nullable = false, unique = true)
    private String appKey;

    @Column(name = "app_name")
    private String appName;

    @Column(name = "app_type")
    private String appType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
