package com.apm.dashboard.controller;

import com.apm.dashboard.model.entity.LogAppSlowQuery;
import com.apm.dashboard.model.entity.StatAppSql;
import com.apm.dashboard.service.SqlMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대상 애플리케이션에서 실행된 SQL 쿼리의 성능 및 슬로우 쿼리를 모니터링하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/monitor/sql")
@RequiredArgsConstructor
public class SqlMonitoringController {

    private final SqlMonitoringService sqlMonitoringService;

    /**
     * 특정 기간 동안의 SQL 실행 통계(수행 횟수, 평균 시간 등)를 조회합니다.
     * 주로 SQL Performance 라인/바 차트 렌더링에 사용됩니다.
     * @param appId 대상 앱 ID
     * @param minutes 조회 범위 (분 단위)
     * @return SQL 통계 데이터 리스트
     */
    @GetMapping("/stats")
    public List<StatAppSql> getSqlStats(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "5") int minutes) {
        return sqlMonitoringService.getSqlStats(appId, minutes);
    }

    /**
     * 소요 시간이 긴 상위 50개의 SQL 쿼리 목록을 조회합니다.
     * @param appId 대상 앱 ID
     * @param minutes 조회 범위
     * @return 슬로우 쿼리 내역
     */
    @GetMapping("/slow/top")
    public List<LogAppSlowQuery> getTopSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getTopSlowQueries(appId, minutes);
    }

    /**
     * 가장 최근에 발생한 슬로우/에러 발생 SQL 쿼리를 조회합니다.
     * @param appId 대상 앱 ID
     * @param minutes 조회 범위
     * @return 최신 슬로우 쿼리 리스트
     */
    @GetMapping("/slow/recent")
    public List<LogAppSlowQuery> getRecentSlowQueries(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return sqlMonitoringService.getRecentSlowQueries(appId, minutes);
    }
}
