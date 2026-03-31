package com.apm.dashboard.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.model.dto.LayoutDto;
import com.apm.dashboard.model.entity.DashboardLayout;
import com.apm.dashboard.repository.DashboardLayoutRepository;

import lombok.RequiredArgsConstructor;

/**
 * 대시보드의 레이아웃 정보를 관리하는 서비스 클래스입니다.
 * 사용자가 정의한 패널의 위치, 크기 및 설정값(JSON)을 영구 저장소에 보관하고 조회합니다.
 */
@Service
@RequiredArgsConstructor
public class LayoutService {

    private final DashboardLayoutRepository layoutRepository;

    /**
     * 특정 사용자의 저장된 레이아웃 정보를 조회합니다.
     * @param userId 사용자 식별 ID
     * @return 레이아웃 DTO (없는 경우 Optional.empty)
     */
    @Transactional(readOnly = true)
    public Optional<LayoutDto> getLayout(String userId) {
        return layoutRepository.findByUserId(userId)
                .map(entity -> LayoutDto.builder()
                        .userId(entity.getUserId())
                        .panelsJson(entity.getPanelsJson())
                        .layoutsJson(entity.getLayoutsJson())
                        .build());
    }

    /**
     * 사용자가 대시보드 화면상에서 수정한 레이아웃 정보를 저장하거나 업데이트합니다.
     * @param dto 화면 레이아웃 및 패널 정보
     */
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
