package com.apm.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.apm.dashboard.model.dto.LayoutDto;
import com.apm.dashboard.service.LayoutService;

import lombok.RequiredArgsConstructor;

/**
 * 사용자의 대시보드 레이아웃 설정을 관리하는 컨트롤러입니다.
 * 패널의 위치, 크기, 활성화 여부 등을 저장하고 조회합니다.
 */
@RestController
@RequestMapping("/api/layout")
@RequiredArgsConstructor
public class LayoutController {

    private final LayoutService layoutService;

    /**
     * 특정 사용자의 대시보드 레이아웃 설정을 조회합니다.
     * @param userId 사용자 ID
     * @return 사용자별 맞춤 레이아웃 DTO
     */
    @GetMapping("/{userId}")
    public ResponseEntity<LayoutDto> getLayout(@PathVariable("userId") String userId) {
        return layoutService.getLayout(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 사용자가 수정한 대시보드 레이아웃 설정을 저장합니다.
     * @param dto 레이아웃 설정 데이터
     * @return 성공 여부
     */
    @PostMapping
    public ResponseEntity<Void> saveLayout(@RequestBody LayoutDto dto) {
        layoutService.saveLayout(dto);
        return ResponseEntity.ok().build();
    }
}
