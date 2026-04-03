package com.apm.dashboard.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.apm.dashboard.model.entity.WidgetInfo;
import com.apm.dashboard.repository.WidgetInfoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WidgetInfoService {
    private final WidgetInfoRepository widgetInfoRepository;

    public List<WidgetInfo> getAllWidgets() {
        return widgetInfoRepository.findAll();
    }

    public List<WidgetInfo> getActiveWidgets() {
        return widgetInfoRepository.findAllByIsActiveTrue();
    }

    @Transactional
    public WidgetInfo saveWidget(WidgetInfo widgetInfo) {
        if (widgetInfo.getCreatedAt() == null) {
            return WidgetInfo.builder()
                .widgetType(widgetInfo.getWidgetType())
                .label(widgetInfo.getLabel())
                .description(widgetInfo.getDescription())
                .minW(widgetInfo.getMinW())
                .minH(widgetInfo.getMinH())
                .isActive(widgetInfo.getIsActive())
                .createdAt(LocalDateTime.now())
                .build();
        }
        return widgetInfoRepository.save(widgetInfo);
    }

    @Transactional
    public void toggleWidgetActive(Long id) {
        widgetInfoRepository.findById(id).ifPresent(widget -> {
            WidgetInfo updated = WidgetInfo.builder()
                .id(widget.getId())
                .widgetType(widget.getWidgetType())
                .label(widget.getLabel())
                .description(widget.getDescription())
                .minW(widget.getMinW())
                .minH(widget.getMinH())
                .isActive(!widget.getIsActive())
                .createdAt(widget.getCreatedAt())
                .build();
            widgetInfoRepository.save(updated);
        });
    }
}
