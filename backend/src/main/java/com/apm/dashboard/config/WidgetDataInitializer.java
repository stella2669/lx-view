package com.apm.dashboard.config;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.apm.dashboard.model.entity.WidgetInfo;
import com.apm.dashboard.repository.WidgetInfoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 서버 최초 구동 시 apm_widget_info 테이블이 비어 있으면
 * 필수 기본 위젯 데이터를 자동으로 삽입합니다.
 *
 * <pre>
 * [시딩 전략]
 *   - count() == 0 인 경우에만 실행 (멱등성 보장)
 *   - 각 위젯의 widgetType은 UNIQUE 제약 조건이 있으므로 중복 삽입 없음
 *   - 운영 중 수동으로 위젯을 추가/삭제해도 재시딩되지 않음
 * </pre>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WidgetDataInitializer implements ApplicationRunner {

    private final WidgetInfoRepository widgetInfoRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (widgetInfoRepository.count() > 0) {
            return;
        }

        log.info("[WidgetDataInitializer] apm_widget_info 테이블이 비어 있습니다. 기본 위젯 데이터를 삽입합니다.");

        LocalDateTime now = LocalDateTime.now();

        List<WidgetInfo> defaultWidgets = List.of(
            WidgetInfo.builder()
                .widgetType("TRANSACTION_LIST")
                .label("실시간 트랜잭션")
                .description("애플리케이션에서 처리 중인 실시간 트랜잭션 목록 및 응답시간")
                .isActive(true)
                .minW(4).minH(3)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("TRANSACTION_CHART")
                .label("트랜잭션 추이")
                .description("시간대별 트랜잭션 처리량(TPS) 및 응답시간 추이 차트")
                .isActive(true)
                .minW(4).minH(3)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("JVM_MEMORY")
                .label("JVM 메모리")
                .description("힙(Heap) / 논힙(Non-Heap) 메모리 사용량 및 GC 현황")
                .isActive(true)
                .minW(3).minH(3)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("JVM_CPU")
                .label("JVM CPU")
                .description("JVM 프로세스 및 시스템 전체 CPU 사용률 모니터링")
                .isActive(true)
                .minW(3).minH(3)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("JVM_THREAD")
                .label("JVM 스레드")
                .description("실행 중 / 대기 / 차단 스레드 수 및 데드락 감지")
                .isActive(true)
                .minW(3).minH(2)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("SQL_SLOW_QUERY")
                .label("슬로우 쿼리")
                .description("임계치 초과 슬로우 SQL 및 오류 쿼리 목록")
                .isActive(true)
                .minW(4).minH(3)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("ACTIVE_SERVICES")
                .label("활성 서비스")
                .description("현재 에이전트가 연결된 모니터링 대상 애플리케이션 현황")
                .isActive(true)
                .minW(3).minH(2)
                .createdAt(now)
                .build(),
            WidgetInfo.builder()
                .widgetType("TOP_STATS")
                .label("주요 지표 요약")
                .description("처리량(TPS), 평균 응답시간, 오류율 등 핵심 지표 요약")
                .isActive(true)
                .minW(4).minH(2)
                .createdAt(now)
                .build()
        );

        widgetInfoRepository.saveAll(defaultWidgets);
        log.info("[WidgetDataInitializer] 기본 위젯 {}개 삽입 완료.", defaultWidgets.size());
    }
}
