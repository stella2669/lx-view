package com.apm.dashboard.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.config.security.JwtProvider;
import com.apm.dashboard.exception.AuthenticationException;
import com.apm.dashboard.exception.BusinessException;
import com.apm.dashboard.exception.TokenExpiredException;
import com.apm.dashboard.exception.TokenReuseDetectedException;
import com.apm.dashboard.model.dto.AuthDto;
import com.apm.dashboard.model.entity.RefreshToken;
import com.apm.dashboard.model.entity.User;
import com.apm.dashboard.repository.RefreshTokenRepository;
import com.apm.dashboard.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 사용자 인증 및 JWT 토큰 라이프사이클을 관리하는 서비스입니다.
 *
 * <pre>
 * 보안 전략:
 * 1. Refresh Token Rotation  — 갱신 시 기존 토큰 폐기 + 신규 발급
 * 2. Reuse Detection          — 폐기된 토큰 수신 시 해당 유저 전체 세션 강제 만료
 * 3. HttpOnly Cookie          — Refresh Token은 JS에서 접근 불가 (컨트롤러에서 처리)
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    /**
     * 신규 사용자를 시스템에 등록합니다.
     */
    @Transactional
    public void signup(AuthDto.SignupRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new BusinessException("Username already exists", org.springframework.http.HttpStatus.CONFLICT, "USER_EXISTS");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("ROLE_USER")
                .build();

        userRepository.save(user);
    }

    /**
     * 사용자 자격 증명을 확인하고 인증 성공 시 토큰 세트를 발급합니다.
     * Refresh Token은 AuthResponse에 담겨 컨트롤러에서 HttpOnly Cookie로 설정됩니다.
     */
    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AuthenticationException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AuthenticationException("Invalid username or password");
        }

        // 로그인 시 기존 활성 토큰을 모두 폐기하고 새로 발급 (단일 세션 정책)
        refreshTokenRepository.revokeAllActiveByUser(user);

        return generateAuthResponse(user);
    }

    /**
     * Refresh Token을 검증하고 새로운 토큰 세트를 발급합니다.
     *
     * <pre>
     * [Reuse Detection 흐름]
     * 1. DB에서 토큰 조회 (폐기 여부 무관)
     * 2. 토큰이 이미 폐기됨(isRevoked=true)?
     *    → 탈취 의심! 해당 유저 전체 세션 강제 만료
     * 3. 토큰이 유효?
     *    → 기존 토큰 폐기(Rotation) + 신규 발급
     * </pre>
     */
    @Transactional
    public AuthDto.AuthResponse refreshToken(String requestToken) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(requestToken)
                .orElseThrow(() -> new AuthenticationException("Refresh token not found in database"));

        // ── Reuse Detection: 이미 폐기된 토큰이 재사용됨 → 세션 하이재킹 의심 ──
        if (storedToken.isRevoked()) {
            log.warn("[SECURITY] \uD83D\uDEA8 Reuse Detection! 폐기된 Refresh Token 재사용 감지. user={}, tokenId={}",
                    storedToken.getUser().getUsername(), storedToken.getId());
            // 해당 유저의 모든 활성 토큰을 강제 폐기
            refreshTokenRepository.revokeAllActiveByUser(storedToken.getUser());
            throw new TokenReuseDetectedException("Refresh token reuse detected! All sessions revoked for security.");
        }

        // ── 만료 확인 ──
        if (storedToken.getExpiryDate().isBefore(Instant.now())) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw new TokenExpiredException("Refresh token expired. Please sign in again.");
        }

        // ── Rotation: 기존 토큰 폐기 → 새 토큰 발급 ──
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        return generateAuthResponse(storedToken.getUser());
    }

    /**
     * 로그아웃: 해당 유저의 모든 활성 Refresh Token을 폐기합니다.
     * 컨트롤러에서 Cookie 삭제를 함께 처리합니다.
     */
    @Transactional
    public void logout(String refreshTokenValue) {
        refreshTokenRepository.findByToken(refreshTokenValue)
                .ifPresent(token -> {
                    refreshTokenRepository.revokeAllActiveByUser(token.getUser());
                    log.info("[AUTH] 로그아웃 처리 완료. user={}", token.getUser().getUsername());
                });
    }

    /**
     * Access Token + Refresh Token을 새로 생성하여 반환합니다.
     * Refresh Token은 DB에 저장되고, 컨트롤러에서 HttpOnly Cookie로 설정됩니다.
     */
    private AuthDto.AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtProvider.createAccessToken(user.getUsername(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getUsername());

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .isRevoked(false)
                .createdAt(Instant.now())
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthDto.AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken) // 컨트롤러에서 Cookie로 이동 후 응답 바디에서 제거
                .username(user.getUsername())
                .role(user.getRole())
                .build();
    }
}
