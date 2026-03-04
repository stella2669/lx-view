package com.apm.dashboard.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActiveServiceData {
    private long timestamp;
    private String serviceName;
    private int activeCount;
}
