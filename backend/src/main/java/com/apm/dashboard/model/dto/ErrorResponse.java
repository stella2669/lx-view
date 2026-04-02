package com.apm.dashboard.model.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 전역으로 사용되는 통일된 에러 응답 객체입니다.
 */
@Getter
@Builder
public class ErrorResponse {
    private final LocalDateTime timestamp;
    private final int status;
    private final String error;
    private final String errorCode;
    private final String message;
    private final String path;
}
