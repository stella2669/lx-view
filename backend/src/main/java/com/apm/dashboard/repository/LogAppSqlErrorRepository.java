package com.apm.dashboard.repository;

import com.apm.dashboard.model.entity.LogAppSqlError;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface LogAppSqlErrorRepository extends JpaRepository<LogAppSqlError, Long> {

    // 특정 앱에서 발생한 기간 내의 최신 SQL 에러 가져오기
    List<LogAppSqlError> findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            Long appId, LocalDateTime start, LocalDateTime end);
}
