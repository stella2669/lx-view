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

    @Column(nullable = false, unique = true)
    private String widgetType; // 예: "TransactionFlow", "XViewChart"

    private String label; // 표시 이름
    private String description; // 설명

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    private Integer minW; // 최소 너비
    private Integer minH; // 최소 높이

    private LocalDateTime createdAt;
}
