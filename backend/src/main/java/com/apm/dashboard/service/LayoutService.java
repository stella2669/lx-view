package com.apm.dashboard.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.model.dto.LayoutDto;
import com.apm.dashboard.model.entity.DashboardLayout;
import com.apm.dashboard.repository.DashboardLayoutRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LayoutService {

    private final DashboardLayoutRepository layoutRepository;

    @Transactional(readOnly = true)
    public Optional<LayoutDto> getLayout(String userId) {
        return layoutRepository.findByUserId(userId)
                .map(entity -> LayoutDto.builder()
                        .userId(entity.getUserId())
                        .panelsJson(entity.getPanelsJson())
                        .layoutsJson(entity.getLayoutsJson())
                        .build());
    }

    @Transactional
    public void saveLayout(LayoutDto dto) {
        DashboardLayout layout = layoutRepository.findByUserId(dto.getUserId())
                .orElse(DashboardLayout.builder()
                        .userId(dto.getUserId())
                        .build());
        
        layout.setPanelsJson(dto.getPanelsJson());
        layout.setLayoutsJson(dto.getLayoutsJson());
        
        layoutRepository.save(layout);
    }
}
