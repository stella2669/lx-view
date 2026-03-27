package com.apm.dashboard.config.security;

import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class JwtProvider {

    // [Anti-Gravity] 실제 운영 환경에서는 application.yml 등의 설정에서 주입받아야 함.
    private String secret = "antigravity-dashboard-jwt-secret-key-for-lx-view-2026";
    private long accessTokenValidity = 3600000; // 1시간
    private long refreshTokenValidity = 3600000 * 24 * 7; // 7일

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
