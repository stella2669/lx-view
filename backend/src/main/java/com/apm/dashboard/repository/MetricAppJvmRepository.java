package com.apm.dashboard.repository;

import com.apm.dashboard.model.entity.MetricAppJvm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * JVM 메트릭 이력 리포지토리입니다.
 * 1분 단위 스냅샷으로 적재된 JVM 지표를 시간 범위로 조회합니다.
 */
@Repository
public interface MetricAppJvmRepository extends JpaRepository<MetricAppJvm, Long> {

    /** 특정 앱의 JVM 메트릭 이력을 시간순으로 조회합니다. (차트용) */
    List<MetricAppJvm> findByAppIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            Long appId, LocalDateTime start, LocalDateTime end);
}
