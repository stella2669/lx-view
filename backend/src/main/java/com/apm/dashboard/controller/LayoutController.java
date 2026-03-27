package com.apm.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.apm.dashboard.model.dto.LayoutDto;
import com.apm.dashboard.service.LayoutService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/layout")
@RequiredArgsConstructor
public class LayoutController {

    private final LayoutService layoutService;

    @GetMapping("/{userId}")
    public ResponseEntity<LayoutDto> getLayout(@PathVariable("userId") String userId) {
        return layoutService.getLayout(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Void> saveLayout(@RequestBody LayoutDto dto) {
        layoutService.saveLayout(dto);
        return ResponseEntity.ok().build();
    }
}
