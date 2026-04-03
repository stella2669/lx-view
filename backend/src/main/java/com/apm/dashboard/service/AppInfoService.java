package com.apm.dashboard.service;

import com.apm.dashboard.model.entity.AppInfo;
import com.apm.dashboard.repository.AppInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AppInfoService {

    private final AppInfoRepository appInfoRepository;

    @Transactional(readOnly = true)
    public List<AppInfo> getAllApps() {
        return appInfoRepository.findAll();
    }

    @Transactional
    public AppInfo createApp(AppInfo appInfo) {
        if (appInfoRepository.findByAppKey(appInfo.getAppKey()).isPresent()) {
            throw new IllegalArgumentException("AppKey already exists: " + appInfo.getAppKey());
        }
        
        AppInfo newApp = AppInfo.builder()
                .appKey(appInfo.getAppKey())
                .appName(appInfo.getAppName())
                .appType(appInfo.getAppType())
                .isActive(appInfo.getIsActive() != null ? appInfo.getIsActive() : true)
                .createdAt(LocalDateTime.now())
                .build();
                
        return appInfoRepository.save(newApp);
    }

    @Transactional
    public AppInfo updateApp(Long id, AppInfo updateData) {
        AppInfo existing = appInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("AppInfo not found for id: " + id));

        // Builder pattern without @Setter requires recreation or we use a basic update.
        // Wait, since AppInfo has @Builder and we want to update it, we can create a toBuilder() or manually update if @Setter exists.
        // Since original AppInfo didn't have @Setter, this might be tricky. Let's see if we should add @Setter to AppInfo or recreate.
        AppInfo updated = AppInfo.builder()
                .id(existing.getId())
                .appKey(existing.getAppKey()) // appKey should not be changed typically
                .appName(updateData.getAppName() != null ? updateData.getAppName() : existing.getAppName())
                .appType(updateData.getAppType() != null ? updateData.getAppType() : existing.getAppType())
                .isActive(updateData.getIsActive() != null ? updateData.getIsActive() : existing.getIsActive())
                .createdAt(existing.getCreatedAt())
                .build();
                
        return appInfoRepository.save(updated);
    }

    // Hard delete is not allowed as per user request (only toggle isActive).
    // We will just set isActive = false.
    @Transactional
    public AppInfo deactivateApp(Long id) {
        AppInfo existing = appInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("AppInfo not found for id: " + id));

        AppInfo updated = AppInfo.builder()
                .id(existing.getId())
                .appKey(existing.getAppKey())
                .appName(existing.getAppName())
                .appType(existing.getAppType())
                .isActive(false)
                .createdAt(existing.getCreatedAt())
                .build();
                
        return appInfoRepository.save(updated);
    }
}
