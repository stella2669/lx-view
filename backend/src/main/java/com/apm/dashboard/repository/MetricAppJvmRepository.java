package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.MetricAppJvm;

@Repository
public interface MetricAppJvmRepository extends JpaRepository<MetricAppJvm, Long> {
}
