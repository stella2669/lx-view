package com.apm.dashboard.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.apm.dashboard.config.security.JwtProvider;
import com.apm.dashboard.model.dto.AuthDto;
import com.apm.dashboard.service.AuthService;

import lombok.RequiredArgsConstructor;

/**
 * 사용자 인증 및 계정 관리를 담당하는 컨트롤러입니다.
 *
 * <pre>
 * 보안 정책:
 * - Refresh Token은 HttpOnly + Secure + SameSite=Strict Cookie로 전달
 * - 응답 바디에는 Access Token만 포함
 * - 로그아웃 시 Cookie 삭제 + DB 토큰 폐기
 * </pre>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final AuthService authService;
    private final JwtProvider jwtProvider;

    /**
     * 신규 사용자를 등록합니다.
     */
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody AuthDto.SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok("User registered successfully");
    }

    /**
     * 사용자 로그인을 처리합니다.
     * - Access Token: 응답 바디
     * - Refresh Token: HttpOnly Cookie (JS 접근 불가)
     */
    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody AuthDto.LoginRequest request) {
        AuthDto.AuthResponse response = authService.login(request);

        // Refresh Token → HttpOnly Cookie에 설정
        ResponseCookie cookie = buildRefreshCookie(response.getRefreshToken());

        // 응답 바디에서 Refresh Token 제거 (Cookie로 이동했으므로)
        AuthDto.AuthResponse safeResponse = AuthDto.AuthResponse.builder()
                .accessToken(response.getAccessToken())
                .username(response.getUsername())
                .role(response.getRole())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(safeResponse);
    }

    /**
     * Refresh Token(Cookie)을 사용하여 새로운 토큰을 발급받습니다.
     * - Cookie에서 자동으로 Refresh Token을 읽음
     * - 새 Refresh Token은 다시 Cookie로 설정 (Rotation)
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthDto.AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401).build();
        }

        AuthDto.AuthResponse response = authService.refreshToken(refreshToken);

        // 신규 Refresh Token → Cookie 갱신 (Rotation)
        ResponseCookie cookie = buildRefreshCookie(response.getRefreshToken());

        AuthDto.AuthResponse safeResponse = AuthDto.AuthResponse.builder()
                .accessToken(response.getAccessToken())
                .username(response.getUsername())
                .role(response.getRole())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(safeResponse);
    }

    /**
     * 로그아웃: DB에서 Refresh Token을 폐기하고 Cookie를 삭제합니다.
     */
    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {

        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }

        // Cookie를 maxAge=0으로 덮어써서 즉시 삭제
        ResponseCookie deleteCookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .path("/api/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body("Successfully logged out");
    }

    // ────────────────────────────────────────────────────────────
    // 내부 헬퍼
    // ────────────────────────────────────────────────────────────

    /**
     * HttpOnly + Secure + SameSite=Strict Refresh Token Cookie를 생성합니다.
     * path를 /api/auth로 제한하여 다른 API 호출 시에는 Cookie가 전송되지 않습니다.
     */
    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)                // JS에서 document.cookie 접근 차단 (XSS 방어)
                .secure(true)                  // HTTPS에서만 전송
                .path("/api/auth")             // 인증 관련 API에만 Cookie 전송
                .maxAge(jwtProvider.getRefreshTokenValidityMs() / 1000) // 초 단위 변환
                .sameSite("Strict")            // CSRF 방어 — 외부 사이트에서 전송 차단
                .build();
    }
}
