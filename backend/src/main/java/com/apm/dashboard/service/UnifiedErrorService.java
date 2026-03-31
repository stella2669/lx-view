package com.apm.dashboard.service;

import com.apm.dashboard.model.dto.UnifiedErrorDto;
import com.apm.dashboard.model.entity.LogAppError;
import com.apm.dashboard.model.entity.LogAppSqlError;
import com.apm.dashboard.repository.LogAppErrorRepository;
import com.apm.dashboard.repository.LogAppSqlErrorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 애플리케이션 에러(RuntimeException 등) 및 SQL 에러 이력을 통합하여 관리하는 서비스입니다.
 * 서로 다른 성격의 에러를 하나의 통일된 뷰(Unified View)로 제공하기 위해 병합 및 정렬 처리를 수행합니다.
 */
@Service
@RequiredArgsConstructor
public class UnifiedErrorService {

    private final LogAppErrorRepository logAppErrorRepository;
    private final LogAppSqlErrorRepository logAppSqlErrorRepository;

    /**
     * 특정 앱의 최근 발생한 모든 종류의 에러를 조회하여 발생 시점 기준 내림차순으로 정렬 후 상위 50건을 반환합니다.
     * 대시보드의 'Recent Errors' 통합 목록에 사용됩니다.
     * 
     * @param appId 대상 앱 ID
     * @param minutes 조회 대상 기간
     * @return 통합 에러 DTO 리스트
     */
    public List<UnifiedErrorDto> getRecentErrors(Long appId, int minutes) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutes);

        // 1. 애플리케이션 에러 조회
        List<LogAppError> appErrors = logAppErrorRepository
                .findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(appId, start, end);

        // 2. SQL 에러 조회
        List<LogAppSqlError> sqlErrors = logAppSqlErrorRepository
                .findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(appId, start, end);

        List<UnifiedErrorDto> combined = new ArrayList<>();

        // 3. 앱 에러 매핑
        for (LogAppError err : appErrors) {
            combined.add(UnifiedErrorDto.builder()
                    .id("APP-" + err.getId())
                    .type("APP")
                    .occurredAt(err.getOccurredAt())
                    .title(err.getExceptionName())
                    .message(err.getErrorMessage())
                    .source(err.getRequestUrl())
                    .originalPayload(err)
                    .build());
        }

        // 4. SQL 에러 매핑
        for (LogAppSqlError err : sqlErrors) {
            combined.add(UnifiedErrorDto.builder()
                    .id("SQL-" + err.getId())
                    .type("SQL")
                    .occurredAt(err.getOccurredAt())
                    .title("SQL Error")
                    .message(err.getErrorMessage())
                    .source(err.getSqlQuery())
                    .originalPayload(err)
                    .build());
        }

        // 5. 전체 발생 일시 기준 정렬 및 상위 50건 추출
        return combined.stream()
                .sorted(Comparator.comparing(UnifiedErrorDto::getOccurredAt).reversed())
                .limit(50)
                .collect(Collectors.toList());
    }
}
