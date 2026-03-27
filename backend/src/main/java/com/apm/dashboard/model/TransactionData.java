package com.apm.dashboard.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionData {
    private String id;
    private long timestamp;
    private int responseTimeMs;
    private String serviceName;
    @com.fasterxml.jackson.annotation.JsonProperty("isError")
    private boolean error;
    private int httpStatusCode;
}
