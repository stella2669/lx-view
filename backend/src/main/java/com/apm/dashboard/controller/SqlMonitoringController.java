package com.apm.dashboard.controller;

import com.apm.dashboard.model.entity.LogAppSlowQuery;
import com.apm.dashboard.model.entity.StatAppSql;
import com.apm.dashboard.service.SqlMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/monitor/sql")
@RequiredArgsConstructor

public class SqlMonitoringController {

    private final SqlMonitoringService sqlMonitoringService;

    // 1분 단위 누적/평균 SQL 통계 지표 조회 (라인/바 차트 용도)
    @GetMapping("/stats")
    public List<StatAppSql> getSqlStats(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "5") int minutes) {
        return sqlMonitoringService.getSqlStats(appId, minutes);
    }

    // 소요시간이 가장 오래 걸린 쿼리 Top 50 조회 (목록 용도)
    @GetMapping("/slow/top")
    public List<LogAppSlowQuery> getTopSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getTopSlowQueries(appId, minutes);
    }

    // 가장 최근에 발생한 슬로우/에러 쿼리 최근 50건 조회 (테이블 용도)
    @GetMapping("/slow/recent")
    public List<LogAppSlowQuery> getRecentSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getRecentSlowQueries(appId, minutes);
    }
}
