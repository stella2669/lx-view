package com.apm.dashboard.controller;

import com.apm.dashboard.model.dto.UnifiedErrorDto;
import com.apm.dashboard.service.UnifiedErrorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/monitor/errors")
@RequiredArgsConstructor
public class UnifiedErrorController {

    private final UnifiedErrorService unifiedErrorService;

    @GetMapping("/recent")
    public List<UnifiedErrorDto> getRecentUnifiedErrors(
            @RequestParam(defaultValue = "1") Long appId,
            @RequestParam(defaultValue = "60") int minutes) {
        return unifiedErrorService.getRecentErrors(appId, minutes);
    }
}
