package com.apm.dashboard.service;

import com.apm.dashboard.model.entity.LogAppSlowQuery;
import com.apm.dashboard.model.entity.StatAppSql;
import com.apm.dashboard.repository.LogAppSlowQueryRepository;
import com.apm.dashboard.repository.StatAppSqlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SqlMonitoringService {

    private final StatAppSqlRepository statAppSqlRepository;
    private final LogAppSlowQueryRepository logAppSlowQueryRepository;

    @Transactional(readOnly = true)
    public List<StatAppSql> getSqlStats(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);

        return statAppSqlRepository.findByAppIdAndBaseTimeBetweenOrderByBaseTimeAsc(appId, startTime, endTime);
    }

    @Transactional(readOnly = true)
    public List<LogAppSlowQuery> getTopSlowQueries(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);

        return logAppSlowQueryRepository.findTop50ByAppIdAndExecutedAtBetweenOrderByExecutionTimeMsDesc(appId,
                startTime, endTime);
    }

    @Transactional(readOnly = true)
    public List<LogAppSlowQuery> getRecentSlowQueries(Long appId, int minutesParam) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusMinutes(minutesParam);

        return logAppSlowQueryRepository.findTop50ByAppIdAndExecutedAtBetweenOrderByExecutedAtDesc(appId, startTime,
                endTime);
    }
}
