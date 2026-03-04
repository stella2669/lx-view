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

@Service
@RequiredArgsConstructor
public class UnifiedErrorService {

    private final LogAppErrorRepository logAppErrorRepository;
    private final LogAppSqlErrorRepository logAppSqlErrorRepository;

    public List<UnifiedErrorDto> getRecentErrors(Long appId, int minutes) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMinutes(minutes);

        List<LogAppError> appErrors = logAppErrorRepository
                .findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(appId, start, end);

        List<LogAppSqlError> sqlErrors = logAppSqlErrorRepository
                .findTop50ByAppIdAndOccurredAtBetweenOrderByOccurredAtDesc(appId, start, end);

        List<UnifiedErrorDto> combined = new ArrayList<>();

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

        for (LogAppSqlError err : sqlErrors) {
            combined.add(UnifiedErrorDto.builder()
                    .id("SQL-" + err.getId())
                    .type("SQL")
                    .occurredAt(err.getOccurredAt())
                    .title("SQL Error")
                    .message(err.getErrorMessage())
                    .source(err.getSqlQuery()) // Snippet
                    .originalPayload(err)
                    .build());
        }

        // Sort by fully descending datetime and limit to top 50
        return combined.stream()
                .sorted(Comparator.comparing(UnifiedErrorDto::getOccurredAt).reversed())
                .limit(50)
                .collect(Collectors.toList());
    }
}
