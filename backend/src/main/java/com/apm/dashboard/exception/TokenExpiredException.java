package com.apm.dashboard.exception;

/**
 * 토큰이 만료되었을 때 발생하는 예외입니다.
 */
public class TokenExpiredException extends AuthenticationException {

    public TokenExpiredException(String message) {
        super(message, "TOKEN_EXPIRED");
    }
}
