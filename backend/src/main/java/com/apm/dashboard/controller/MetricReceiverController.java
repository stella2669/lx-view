package com.apm.dashboard.controller;

import com.apm.dashboard.service.MetricSaveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 외부 APM 에이전트(LxAgent)로부터 수신되는 모든 메트릭 데이터를 처리하는 컨트롤러입니다.
 * 트랜잭션, JVM 지표, 에러 상세 정보 등을 수집하여 백엔드 서비스로 전달합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricReceiverController {

    private final MetricSaveService metricSaveService;

    /** 에이전트 인증 키 — application.yml에서 주입 (하드코딩 금지) */
    @Value("${lx.agent.secret-key}")
    private String validAgentKey;

    /**
     * 에이전트가 배치(Batch)로 보내는 JSON 메트릭 데이터를 수신합니다.
     * 보안을 위한 에이전트 키 검증을 수행하며, 수신된 데이터는 비동기로 처리하여 응답 속도를 최적화합니다.
     * 
     * @param agentKey 헤더를 통해 전달되는 에이전트 인증 키
     * @param metrics  수집된 메트릭 배열 (Transaction, JVM, SQL, Error 등)
     * @return 수신 성공 시 200 OK
     */
    @PostMapping("/collect")
    public ResponseEntity<Void> collectMetrics(
            @RequestHeader(value = "X-LX-Agent-Key", required = false) String agentKey,
            @RequestBody List<Map<String, Object>> metrics) {

        // [Security] 에이전트 전용 인증 키 검증
        if (agentKey == null || !agentKey.equals(validAgentKey)) {
            log.warn("Unauthorized agent access attempt with key: {}. Path: /api/v1/metrics/collect", agentKey);
            return ResponseEntity.status(401).build();
        }

        // [Defensive] 빈 페이로드 체크
        if (metrics == null || metrics.isEmpty()) {
            log.warn("Received empty metric payload from agent.");
            return ResponseEntity.badRequest().build();
        }

        log.debug("Received {} metric items from agent.", metrics.size());

        // 비동기 처리(Fire and Forget)를 통해 에이전트의 대기 시간을 최소화
        metricSaveService.saveMetricsAsync(metrics);

        return ResponseEntity.ok().build();
    }
}

