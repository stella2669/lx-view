package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.LogAppError;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LogAppErrorRepository extends JpaRepository<LogAppError, Long> {

    List<LogAppError> findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            Long appId, LocalDateTime start, LocalDateTime end);
}
