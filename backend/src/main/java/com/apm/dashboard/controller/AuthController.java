package com.apm.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.apm.dashboard.model.dto.AuthDto;
import com.apm.dashboard.service.AuthService;

import lombok.RequiredArgsConstructor;

/**
 * 사용자 인증 및 계정 관리를 담당하는 컨트롤러입니다.
 * 회원가입, 로그인, 토큰 재발급 등의 기능을 제공합니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 신규 사용자를 등록합니다.
     * @param request 회원가입 정보 (username, password 등)
     * @return 등록 성공 메시지
     */
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody AuthDto.SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok("User registered successfully");
    }

    /**
     * 사용자 로그인을 처리하고 JWT 토큰을 발급합니다.
     * @param request 로그인 정보 (ID/PW)
     * @return Access/Refresh 토큰 정보를 포함한 응답
     */
    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Refresh 토큰을 사용하여 새로운 Access 토큰을 발급받습니다.
     * @param refreshToken 클라이언트가 보유한 리프레시 토큰
     * @return 신규 토큰 정보
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthDto.AuthResponse> refresh(@RequestBody String refreshToken) {
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }
}
