package com.apm.dashboard.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.apm.dashboard.model.entity.WidgetInfo;
import com.apm.dashboard.service.WidgetInfoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/widgets")
@RequiredArgsConstructor
public class WidgetInfoController {
    private final WidgetInfoService widgetInfoService;

    @GetMapping
    public ResponseEntity<List<WidgetInfo>> getAllWidgets(@RequestParam(required = false) Boolean activeOnly) {
        if (Boolean.TRUE.equals(activeOnly)) {
            return ResponseEntity.ok(widgetInfoService.getActiveWidgets());
        }
        return ResponseEntity.ok(widgetInfoService.getAllWidgets());
    }

    @PostMapping
    public ResponseEntity<WidgetInfo> createWidget(@RequestBody WidgetInfo widgetInfo) {
        return ResponseEntity.ok(widgetInfoService.saveWidget(widgetInfo));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggleWidget(@PathVariable Long id) {
        widgetInfoService.toggleWidgetActive(id);
        return ResponseEntity.ok().build();
    }
}
