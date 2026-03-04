package com.apm.dashboard.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JvmMetricsData {
    private long timestamp;

    // CPU
    private double processCpuLoad; // 0.0 to 1.0 (or -1 if not available)
    private double systemCpuLoad; // 0.0 to 1.0 (or -1 if not available)

    // Memory (Heap)
    private long heapUsed;
    private long heapMax;
    private long heapCommitted;
    private double heapUsagePercent;

    // Garbage Collection
    private long gcCount;
    private long gcTimeMs;

    // Threads
    private int liveThreads;
    private int deadlockedThreads;
}
