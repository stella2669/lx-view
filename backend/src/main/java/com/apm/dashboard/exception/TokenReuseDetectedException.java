package com.apm.dashboard.exception;

/**
 * Refresh Token 재사용(탈취 가능성)이 감지되었을 때 발생하는 예외입니다.
 */
public class TokenReuseDetectedException extends AuthenticationException {

    public TokenReuseDetectedException(String message) {
        super(message, "TOKEN_REUSE_DETECTED");
    }
}
