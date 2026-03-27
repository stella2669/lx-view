package com.apm.dashboard.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.DashboardLayout;

@Repository
public interface DashboardLayoutRepository extends JpaRepository<DashboardLayout, Long> {
    Optional<DashboardLayout> findByUserId(String userId);
}
