package com.apm.dashboard.exception;

import org.springframework.http.HttpStatus;

/**
 * 인증 및 인가 과정에서 발생하는 예외의 상위 클래스입니다.
 */
public class AuthenticationException extends BusinessException {

    public AuthenticationException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTH_ERROR");
    }

    public AuthenticationException(String message, String errorCode) {
        super(message, HttpStatus.UNAUTHORIZED, errorCode);
    }
}
