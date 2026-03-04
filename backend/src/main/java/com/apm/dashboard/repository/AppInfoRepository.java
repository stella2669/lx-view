package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.AppInfo;
import java.util.Optional;

@Repository
public interface AppInfoRepository extends JpaRepository<AppInfo, Long> {
    Optional<AppInfo> findByAppKey(String appKey);
}
