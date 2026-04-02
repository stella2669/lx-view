package com.apm.dashboard.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 모든 비즈니스 예외의 최상위 클래스입니다.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public BusinessException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
