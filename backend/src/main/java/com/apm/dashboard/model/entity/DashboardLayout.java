package com.apm.dashboard.model.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * [Anti-Gravity] 대시보드 레이아웃 유지 엔티티
 * 복잡한 구조 대신 JSON 문자열(TEXT)로 저장하여 프론트엔드 상태와 가장 유연하게 연동함.
 */
@Entity
@Table(name = "apm_dashboard_layout")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardLayout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String userId; // "default" 또는 실제 사용자 ID

    @Column(columnDefinition = "TEXT")
    private String panelsJson; // DashboardPanel[] 배열의 JSON 직렬화 데이터

    @Column(columnDefinition = "TEXT")
    private String layoutsJson; // Record<string, Layout[]> 객체의 JSON 직렬화 데이터

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
