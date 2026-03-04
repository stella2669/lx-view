package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.StatAppSql;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StatAppSqlRepository extends JpaRepository<StatAppSql, Long> {

    // 주어진 시간 범위와 특정 appId에 해당하는 통계를 시간순으로 조회
    List<StatAppSql> findByAppIdAndBaseTimeBetweenOrderByBaseTimeAsc(Long appId, LocalDateTime startTime,
            LocalDateTime endTime);

    // 특정 앱의 가장 최근 통계 1건 조회
    StatAppSql findFirstByAppIdOrderByBaseTimeDesc(Long appId);
}
