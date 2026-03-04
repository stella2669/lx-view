package com.apm.dashboard.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopStatsData {
    private int active;
    private long requests;
    private long errors;
    private int tps;
    private int threads;
}
