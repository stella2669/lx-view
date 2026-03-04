package com.apm.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apm.dashboard.model.entity.LogSysInternal;

@Repository
public interface LogSysInternalRepository extends JpaRepository<LogSysInternal, Long> {
}
