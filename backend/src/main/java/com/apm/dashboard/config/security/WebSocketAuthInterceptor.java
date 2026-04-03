package com.apm.dashboard.config.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import com.apm.dashboard.exception.AuthenticationException;

/**
 * WebSocket(STOMP) 연결 요청 시 JWT 토큰을 검증하는 인터셉터입니다.
 * STOMP CONNECT 프레임의 헤더 또는 URL 쿼리 파라미터에서 토큰을 추출하여 유효성을 확인합니다.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // 1. STOMP CONNECT 헤더에서 Authorization 추출 (대소문자 모두 체크)
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null) {
                authHeader = accessor.getFirstNativeHeader("authorization");
            }

            String token = null;

            if (authHeader != null && authHeader.trim().startsWith("Bearer ")) {
                token = authHeader.trim().substring(7);
            }

            if (token == null || token.isBlank()) {
                log.warn("WebSocket CONNECT rejected: Missing or empty Authorization header");
                throw new AccessDeniedException("Missing Authentication Token in STOMP Header");
            }

            try {
                if (!jwtProvider.validateToken(token)) {
                    // JwtProvider에서 로그가 이미 남지만, 인터셉터 레벨에서도 사유 추적을 위해 한번 더 기록할 수 있습니다.
                    log.warn("WebSocket CONNECT rejected: Invalid or Expired Token (starts with: {})", 
                        token.length() > 10 ? token.substring(0, 10) + "..." : "short-token");
                    throw new AccessDeniedException("Invalid Authentication Token");
                }
                
                log.debug("WebSocket CONNECT token verified successfully.");
                
            } catch (AccessDeniedException e) {
                // 인증 실패는 정상적인 거부 상황이므로 WARN 레벨로 사유만 기록 (스택트레이스 제외)
                log.warn("WebSocket CONNECT denied: {}", e.getMessage());
                throw e; 
            } catch (Exception e) {
                log.error("Unexpected error during WebSocket token validation", e);
                throw new AccessDeniedException("Authentication failed due to internal error");
            }
        }
        return message;
    }
}
