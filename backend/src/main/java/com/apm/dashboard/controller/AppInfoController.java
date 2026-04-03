package com.apm.dashboard.controller;

import com.apm.dashboard.model.entity.AppInfo;
import com.apm.dashboard.service.AppInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/apps")
@RequiredArgsConstructor
public class AppInfoController {

    private final AppInfoService appInfoService;

    @GetMapping
    public List<AppInfo> getAllApps(@RequestParam(required = false) String query) {
        return appInfoService.getAllApps(query);
    }

    @PostMapping
    public ResponseEntity<AppInfo> createApp(@RequestBody AppInfo appInfo) {
        return ResponseEntity.ok(appInfoService.createApp(appInfo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppInfo> updateApp(@PathVariable Long id, @RequestBody AppInfo appInfo) {
        return ResponseEntity.ok(appInfoService.updateApp(id, appInfo));
    }

    // Rather than DELETE, we allow making it inactive via PUT or DELETE endpoint maps to deactivate.
    @DeleteMapping("/{id}")
    public ResponseEntity<AppInfo> deactivateApp(@PathVariable Long id) {
        return ResponseEntity.ok(appInfoService.deactivateApp(id));
    }
}
