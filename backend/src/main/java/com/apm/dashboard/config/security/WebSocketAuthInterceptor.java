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
            // 1. STOMP CONNECT 헤더에서 Authorization 추출
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            String token = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            // 2. 헤더에 토큰이 없다면 웹소켓 연결에는 주로 Authorization 헤더 전달 제약이 있으므로,
            // 쿼리 파라미터나 다른 방식으로 전달받을 수도 있는지 체크할 수 있습니다.
            // 여기서는 헤더 기반 인증으로 처리합니다.
            if (token == null) {
                // 특정 시나리오에서는 브라우저의 WebSocket API가 헤더를 포함할 수 없어 
                // token 쿼리파라미터나 첫 메시지 payload로 보내기도 합니다. (프론트엔드 조정 필요)
                log.warn("WebSocket CONNECT rejected: Missing Authorization header");
                throw new AccessDeniedException("Missing Authentication Token in STOMP Header");
            }

            try {
                if (!jwtProvider.validateToken(token)) {
                    log.warn("WebSocket CONNECT rejected: Invalid Token");
                    throw new AccessDeniedException("Invalid Authentication Token");
                }
                
                // (선택 사항) accessor.setUser(...) 로 인증된 사용자 정보를 컨텍스트에 설정할 수 있습니다.
                log.debug("WebSocket CONNECT token verified successfully.");
                
            } catch (Exception e) {
                log.error("WebSocket CONNECT error during token validation", e);
                // Spring Security가 런타임 예외를 가로채지 못할 경우를 대비
                throw new AccessDeniedException("Authentication failed");
            }
        }
        return message;
    }
}
