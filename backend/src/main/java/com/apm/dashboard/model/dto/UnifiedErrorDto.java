package com.apm.dashboard.model.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;
import java.time.LocalDateTime;

@Getter
@Builder
@ToString
public class UnifiedErrorDto {
    private String id; // e.g. "APP-12", "SQL-45"
    private String type; // "APP" or "SQL"
    private LocalDateTime occurredAt;
    private String title; // Exception Name or "SQL Error"
    private String message; // Error Message
    private String source; // Request URL or SQL Query snippet

    // UI Modal에 표시하기 위해 원래 Entity의 원본 JSON/객체를 그대로 담아둡니다
    private Object originalPayload;
}
