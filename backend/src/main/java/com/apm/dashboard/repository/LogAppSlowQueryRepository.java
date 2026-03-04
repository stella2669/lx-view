package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.LogAppSlowQuery;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LogAppSlowQueryRepository extends JpaRepository<LogAppSlowQuery, Long> {

    // 주어진 시간 범위, appId 내에서 수행시간이 가장 오래 걸린 순으로(Top N) 조회
    List<LogAppSlowQuery> findTop50ByAppIdAndExecutedAtBetweenOrderByExecutionTimeMsDesc(Long appId,
            LocalDateTime startTime, LocalDateTime endTime);

    // 최근 발생한 슬로우 쿼리 순서대로 조회 (Time-based view)
    List<LogAppSlowQuery> findTop50ByAppIdAndExecutedAtBetweenOrderByExecutedAtDesc(Long appId, LocalDateTime startTime,
            LocalDateTime endTime);
}
