package com.apm.dashboard.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.config.security.JwtProvider;
import com.apm.dashboard.model.dto.AuthDto;
import com.apm.dashboard.model.entity.RefreshToken;
import com.apm.dashboard.model.entity.User;
import com.apm.dashboard.repository.RefreshTokenRepository;
import com.apm.dashboard.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * 사용자의 인증 및 권한 관리를 담당하는 서비스 클래스입니다.
 * 회원가입, 로그인, JWT 토큰(Access/Refresh) 발급 및 만료 처리를 수행합니다.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    /**
     * 신규 사용자를 시스템에 등록합니다.
     * @param request 사용자 등록 정보
     */
    @Transactional
    public void signup(AuthDto.SignupRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists: " + request.getUsername());
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
     * @param request 로그인 정보
     * @return 발급된 토큰 및 사용자 정보 응답 객체
     */
    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        return generateAuthResponse(user);
    }

    /**
     * 유효한 Refresh 토큰을 바탕으로 새로운 Access 토큰을 재발급합니다.
     * @param requestToken 클라이언트로부터 전달받은 리프레시 토큰
     * @return 갱신된 토큰 세트
     */
    @Transactional
    public AuthDto.AuthResponse refreshToken(String requestToken) {
        return refreshTokenRepository.findByToken(requestToken)
                .map(this::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(this::generateAuthResponse)
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    /**
     * 로그인이 성공하거나 토큰 갱신 시점에 새로운 토큰들을 생성하고 저장합니다. (Refresh Token Rotation 적용)
     */
    private AuthDto.AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtProvider.createAccessToken(user.getUsername(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getUsername());

        // 보안을 위해 기존 토큰 삭제 후 새 토큰 저장
        refreshTokenRepository.deleteByUser(user);
        
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        
        refreshTokenRepository.save(refreshTokenEntity);

        return AuthDto.AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .role(user.getRole())
                .build();
    }

    /**
     * Refresh 토큰의 만료 여부를 확인합니다. 만료 시 DB에서 삭제합니다.
     */
    private RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }
}
