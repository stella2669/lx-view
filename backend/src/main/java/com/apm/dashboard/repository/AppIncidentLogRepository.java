package com.apm.dashboard.repository;

import com.apm.dashboard.model.entity.AppIncidentLog;
import com.apm.dashboard.model.entity.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AppIncidentLog 단일 리포지토리입니다.
 * 기존의 LogAppErrorRepository, LogAppSqlErrorRepository, LogAppSlowQueryRepository를 대체합니다.
 */
@Repository
public interface AppIncidentLogRepository extends JpaRepository<AppIncidentLog, Long> {

    /**
     * 특정 앱의 모든 타입 인시던트를 최신순으로 조회합니다. (통합 에러 뷰)
     */
    List<AppIncidentLog> findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            Long appId, LocalDateTime start, LocalDateTime end);

    /**
     * 특정 앱의 특정 타입 인시던트를 최신순으로 조회합니다. (단일 타입 필터 조회)
     */
    List<AppIncidentLog> findTop50ByAppIdAndIncidentTypeAndOccurredAtBetweenOrderByOccurredAtDesc(
            Long appId, IncidentType incidentType, LocalDateTime start, LocalDateTime end);

    /**
     * 특정 앱의 다중 타입 인시던트를 최신순으로 조회합니다. (에러 계열 통합 조회)
     */
    List<AppIncidentLog> findTop50ByAppIdAndIncidentTypeInAndOccurredAtBetweenOrderByOccurredAtDesc(
            Long appId, List<IncidentType> types, LocalDateTime start, LocalDateTime end);

    /**
     * 특정 앱의 슬로우쿼리를 실행 시간 내림차순으로 조회합니다. (Top Slow Queries 차트용)
     */
    List<AppIncidentLog> findTop50ByAppIdAndIncidentTypeAndOccurredAtBetweenOrderByExecutionTimeMsDesc(
            Long appId, IncidentType incidentType, LocalDateTime start, LocalDateTime end);
}
