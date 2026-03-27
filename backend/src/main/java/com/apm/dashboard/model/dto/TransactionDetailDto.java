package com.apm.dashboard.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDetailDto {
    private String txId;
    private String serviceName;
    private long timestamp;
    private int responseTimeMs;
    private int httpStatusCode;
    @com.fasterxml.jackson.annotation.JsonProperty("isError")
    private boolean error;

    // Error details (Optional)
    private String exceptionName;
    private String errorMessage;
    private String stackTrace;
    private String httpMethod;
    private String requestUrl;
    private String requestParams;
    private String requestBody;
    private String threadName;
}
