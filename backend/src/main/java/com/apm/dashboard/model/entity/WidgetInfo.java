package com.apm.dashboard.model.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "apm_widget_info")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WidgetInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "widget_type", nullable = false, unique = true)
    private String widgetType;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "description")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "min_w")
    private Integer minW;

    @Column(name = "min_h")
    private Integer minH;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
