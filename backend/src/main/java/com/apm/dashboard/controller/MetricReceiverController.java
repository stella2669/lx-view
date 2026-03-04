package com.apm.dashboard.controller;

import com.apm.dashboard.service.MetricSaveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricReceiverController {

    private final MetricSaveService metricSaveService;

    /**
     * LxAgent DataSender가 보내는 JSON 메트릭 배치 배열 데이터를 수신합니다.
     * 
     * @param metrics 수집된 메트릭 배열 원시 데이터 (List of Map)
     * @return Agent 측에 HTTP 200 OK 를 지연 없이 반환 (Fast Return)
     */
    @PostMapping("/collect")
    public ResponseEntity<Void> collectMetrics(@RequestBody List<Map<String, Object>> metrics) {

        // [Defensive] 페이로드 방어 로직 (null 혹은 빈 배열일 시 배제)
        if (metrics == null || metrics.isEmpty()) {
            log.warn("Received empty metric payload from agent.");
            return ResponseEntity.badRequest().build();
        }

        if (log.isDebugEnabled()) {
            log.debug("Received {} metric items from agent.", metrics.size());
        }

        // [Scaling & Performance] DB I/O 등 무거운 작업은 백그라운드 Worker 스레드에 위임(Fire and
        // Forget)
        // Controller는 즉시 응답만 떨어뜨려 에이전트단의 접속 지연(Timeout) 유발 방지
        metricSaveService.saveMetricsAsync(metrics);

        return ResponseEntity.ok().build();
    }
}
