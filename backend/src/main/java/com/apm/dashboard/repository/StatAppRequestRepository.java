package com.apm.dashboard.repository;

import com.apm.dashboard.model.entity.StatAppRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * HTTP 요청 통계 리포지토리입니다.
 * 1분 단위로 집계된 요청 건수/TPS/응답 분포 데이터를 조회합니다.
 */
@Repository
public interface StatAppRequestRepository extends JpaRepository<StatAppRequest, Long> {

    /** 특정 앱의 요청 통계를 시간순으로 조회합니다. (TPS 차트용) */
    List<StatAppRequest> findByAppIdAndBaseTimeBetweenOrderByBaseTimeAsc(
            Long appId, LocalDateTime start, LocalDateTime end);

    /** 특정 앱의 가장 최근 통계 1건 조회 */
    StatAppRequest findFirstByAppIdOrderByBaseTimeDesc(Long appId);
}
