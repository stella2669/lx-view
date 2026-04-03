package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.WidgetInfo;
import java.util.Optional;
import java.util.List;

@Repository
public interface WidgetInfoRepository extends JpaRepository<WidgetInfo, Long> {
    Optional<WidgetInfo> findByWidgetType(String widgetType);
    List<WidgetInfo> findAllByIsActiveTrue();
}
