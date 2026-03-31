package com.apm.dashboard.controller;

import com.apm.dashboard.model.dto.UnifiedErrorDto;
import com.apm.dashboard.service.UnifiedErrorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 애플리케이션 에러와 SQL 에러를 통합하여 모니터링하기 위한 컨트롤러입니다.
 * 실시간 에러 발생 현황을 조회하여 대시보드의 Recent Errors 목록에 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/monitor/errors")
@RequiredArgsConstructor
public class UnifiedErrorController {

    private final UnifiedErrorService unifiedErrorService;

    /**
     * 최근 발생한 통합 에러(APP + SQL) 내역을 조회합니다.
     * @param appId 대상 앱 ID
     * @param minutes 조회 범위 (분 단위)
     * @return 통합 에러 데이터 목록
     */
    @GetMapping("/recent")
    public List<UnifiedErrorDto> getRecentUnifiedErrors(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return unifiedErrorService.getRecentErrors(appId, minutes);
    }
}
