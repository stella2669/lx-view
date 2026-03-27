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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

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

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthDto.AuthResponse refreshToken(String requestToken) {
        return refreshTokenRepository.findByToken(requestToken)
                .map(this::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(this::generateAuthResponse)
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    private AuthDto.AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtProvider.createAccessToken(user.getUsername(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getUsername());

        // 기존 토큰 삭제 후 새 토큰 저장 (Rotation)
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

    private RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }
}
