package com.apm.dashboard.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.model.entity.RefreshToken;
import com.apm.dashboard.model.entity.User;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * 토큰 값으로 조회 (폐기 여부 무관).
     * Reuse Detection: 폐기된 토큰이 들어왔는지 확인하기 위해 isRevoked를 포함하여 조회합니다.
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * 유효한(폐기되지 않은) 토큰만 조회합니다. 일반 갱신 흐름에서 사용합니다.
     */
    Optional<RefreshToken> findByTokenAndIsRevokedFalse(String token);

    /**
     * 특정 유저의 모든 활성 토큰을 일괄 폐기합니다.
     * Reuse Detection 발동 시 (토큰 탈취 의심) 해당 유저의 전체 세션을 강제 만료시킵니다.
     */
    @Modifying
    @Transactional
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.user = :user AND r.isRevoked = false")
    void revokeAllActiveByUser(@Param("user") User user);
}
