package com.apm.dashboard.service;

import com.apm.dashboard.model.dto.UnifiedErrorDto;
import com.apm.dashboard.model.entity.AppIncidentLog;
import com.apm.dashboard.model.entity.IncidentType;
import com.apm.dashboard.repository.AppIncidentLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 타겟 애플리케이션에서 발생한 모든 인시던트(APP_ERROR, SQL_ERROR)를 통합 조회하는 서비스입니다.
 * 기존에 LogAppError + LogAppSqlError 두 개의 리포지토리를 병합·정렬하던 복잡한 로직이
 * AppIncidentLog 단일 테이블 조회로 대체되어 크게 단순화되었습니다.
 */
@Service
@RequiredArgsConstructor
public class UnifiedErrorService {

    private final AppIncidentLogRepository appIncidentLogRepository;

    /**
     * 특정 앱에서 발생한 APP_ERROR 및 SQL_ERROR 인시던트를 최신순으로 통합 조회합니다.
     * 대시보드의 'Recent Errors' 목록에 사용됩니다.
     *
     * @param appId   대상 앱 ID
     * @param minutes 조회 대상 기간 (분 단위)
     * @return 최신순 정렬된 통합 에러 DTO 리스트 (최대 50건)
     */
    public List<UnifiedErrorDto> getRecentErrors(Long appId, int minutes) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutes);

        // 에러 계열(APP_ERROR + SQL_ERROR) 인시던트를 단일 쿼리로 조회
        List<IncidentType> errorTypes = List.of(IncidentType.APP_ERROR, IncidentType.SQL_ERROR);
        List<AppIncidentLog> incidents = appIncidentLogRepository
                .findTop50ByAppIdAndIncidentTypeInAndOccurredAtBetweenOrderByOccurredAtDesc(
                        appId, errorTypes, start, end);

        return incidents.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /** AppIncidentLog 엔티티를 UnifiedErrorDto로 변환합니다. */
    private UnifiedErrorDto toDto(AppIncidentLog log) {
        return UnifiedErrorDto.builder()
                .id(log.getIncidentType().name() + "-" + log.getId())
                .type(log.getIncidentType().name())
                .occurredAt(log.getOccurredAt())
                .title(log.getIncidentType() == IncidentType.APP_ERROR
                        ? log.getExceptionName()
                        : "SQL Error")
                .message(log.getMessage())
                .source(log.getIncidentType() == IncidentType.APP_ERROR
                        ? log.getRequestUrl()
                        : log.getSqlQuery())
                .originalPayload(log)
                .build();
    }
}
