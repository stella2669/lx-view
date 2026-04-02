package com.apm.dashboard.exception;

import com.apm.dashboard.model.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;

/**
 * 애플리케이션 전역에서 발생하는 예외를 한 곳에서 처리하여 일관된 에러 응답을 반환합니다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, HttpServletRequest request) {
        log.warn("Business Exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        return createErrorResponse(ex.getStatus(), ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        log.warn("Authentication Exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        return createErrorResponse(ex.getStatus(), ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled Exception caught: ", ex);
        return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", 
                "An unexpected error occurred", request.getRequestURI());
    }

    private ResponseEntity<ErrorResponse> createErrorResponse(HttpStatus status, String errorCode, String message, String path) {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .errorCode(errorCode)
                .message(message)
                .path(path)
                .build();
        return ResponseEntity.status(status).body(response);
    }
}
