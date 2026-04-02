package com.apm.dashboard.config.security;

import java.security.Key;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * JWT 토큰 생성 및 검증을 담당합니다.
 *
 * <pre>
 * 보안 정책:
 * - Access Token  : 15분 (탈취 시 피해 최소화)
 * - Refresh Token : 7일 (HttpOnly Cookie + DB Rotation으로 관리)
 * - 서명 키       : application.yml에서 주입 (하드코딩 금지)
 * </pre>
 */
@Slf4j
@Component
public class JwtProvider {

    @Value("${jwt.secret}")
    private String secret;

    /** Access Token 유효 시간: 15분 (보안 강화 — 기존 1시간에서 단축) */
    @Value("${jwt.access-token-validity:900000}")
    private long accessTokenValidity;

    /** Refresh Token 유효 시간: 7일 */
    @Value("${jwt.refresh-token-validity:604800000}")
    private long refreshTokenValidity;

    private Key key;

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String createAccessToken(String username, String role) {
        return createToken(username, role, accessTokenValidity);
    }

    public String createRefreshToken(String username) {
        return createToken(username, null, refreshTokenValidity);
    }

    /** Refresh Token 유효 시간(밀리초)을 반환합니다. Cookie maxAge 설정에 사용. */
    public long getRefreshTokenValidityMs() {
        return refreshTokenValidity;
    }

    private String createToken(String username, String role, long validityInMilliseconds) {
        Claims claims = Jwts.claims().setSubject(username);
        if (role != null) {
            claims.put("role", role);
        }

        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
        }
        return false;
    }

    public String getUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();
    }
}
