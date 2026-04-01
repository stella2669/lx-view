package com.apm.dashboard.controller;

import com.apm.dashboard.model.entity.AppIncidentLog;
import com.apm.dashboard.service.SqlMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 타겟 애플리케이션에서 실행된 SQL 쿼리의 성능 및 슬로우 쿼리를 모니터링하는 컨트롤러입니다.
 * AppIncidentLog(SLOW_QUERY 타입) 기반으로 데이터를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/monitor/sql")
@RequiredArgsConstructor
public class SqlMonitoringController {

    private final SqlMonitoringService sqlMonitoringService;

    /**
     * 소요 시간이 긴 상위 50개의 SQL 슬로우쿼리 목록을 조회합니다.
     * @param appId   대상 앱 ID
     * @param minutes 조회 범위 (분 단위)
     */
    @GetMapping("/slow/top")
    public List<AppIncidentLog> getTopSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getTopSlowQueries(appId, minutes);
    }

    /**
     * 가장 최근에 발생한 슬로우 SQL 쿼리를 최신순으로 조회합니다.
     * @param appId   대상 앱 ID
     * @param minutes 조회 범위 (분 단위)
     */
    @GetMapping("/slow/recent")
    public List<AppIncidentLog> getRecentSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getRecentSlowQueries(appId, minutes);
    }
}
