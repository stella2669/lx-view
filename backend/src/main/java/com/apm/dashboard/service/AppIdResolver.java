package com.apm.dashboard.service;

import com.apm.dashboard.repository.AppInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * AppKey(AgentName)를 기반으로 AppId(PK)를 조회하는 공통 컴포넌트입니다.
 * 반복적인 DB 조회를 최소화하기 위해 캐싱 또는 공통 로직을 관리합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AppIdResolver {

    private final AppInfoRepository appInfoRepository;

    /**
     * AppKey를 기반으로 AppId(PK)를 조회합니다.
     * 캐시가 적용되어 있으므로 빠른 조회가 가능합니다.
     * 
     * @param appKey 에이전트 키 (예: PAYMENT-SERVICE)
     * @return 성공 시 AppId, 실패 시 로그를 남기고 기본값(1L) 반환
     */
    // @Cacheable(value = "appIds", key = "#appKey") // Redis나 로컬 캐시 도입 시 활성화 고려
    public Long resolveAppId(String appKey) {
        if (appKey == null || appKey.trim().isEmpty()) {
            return null;
        }

        return appInfoRepository.findByAppKey(appKey)
                .filter(appInfo -> Boolean.TRUE.equals(appInfo.getIsActive()))
                .map(appInfo -> appInfo.getId())
                .orElseGet(() -> {
                    log.debug("Unregistered or inactive appKey received: [{}]. Dropping metrics (returning null).", appKey);
                    return null;
                });
    }
}
