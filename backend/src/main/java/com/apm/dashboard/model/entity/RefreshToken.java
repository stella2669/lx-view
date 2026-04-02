package com.apm.dashboard.model.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사용자별 Refresh Token을 저장합니다.
 *
 * <pre>
 * 보안 전략:
 * - Rotation: 매 갱신 시 기존 토큰을 isRevoked=true로 폐기하고 신규 발급
 * - Reuse Detection: 폐기된 토큰이 재사용되면 해당 유저의 모든 활성 세션 강제 만료
 * - @ManyToOne: 한 유저가 여러 토큰 레코드를 가질 수 있음 (폐기 이력 보존용)
 * </pre>
 */
@Entity
@Table(name = "apm_refresh_token")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 토큰 소유 유저 — ManyToOne으로 폐기 이력 보존 가능 */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private Instant expiryDate;

    /** true면 Rotation 또는 Reuse Detection으로 폐기된 토큰 */
    @Builder.Default
    @Column(nullable = false)
    private boolean isRevoked = false;

    /** 토큰 발급 시각 — 감사 로그 및 만료 정책 적용 기준 */
    @Builder.Default
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
