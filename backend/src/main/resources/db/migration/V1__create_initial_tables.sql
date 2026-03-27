-- LX-View Initial Database Schema (MariaDB)
-- [Anti-Gravity] 초기 테이블 DDL 문 정리

-- 1. 대시보드 애플리케이션 정보
CREATE TABLE IF NOT EXISTS `apm_app_info` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_key` VARCHAR(255) NOT NULL UNIQUE,
    `app_name` VARCHAR(255),
    `app_type` VARCHAR(255),
    `created_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 대시보드 레이아웃 유지 정보
CREATE TABLE IF NOT EXISTS `apm_dashboard_layout` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(255) NOT NULL UNIQUE,
    `panels_json` TEXT,
    `layouts_json` TEXT,
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 애플리케이션 에러 로그
CREATE TABLE IF NOT EXISTS `apm_log_app_error` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `occurred_at` DATETIME(6) NOT NULL,
    `exception_name` VARCHAR(255) NOT NULL,
    `error_message` TEXT,
    `stack_trace` LONGTEXT,
    `request_url` VARCHAR(255),
    `http_method` VARCHAR(10),
    `client_ip` VARCHAR(64),
    `request_params` TEXT,
    `request_body` LONGTEXT,
    `thread_name` VARCHAR(255),
    INDEX `idx_app_error_composite` (`app_id`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 슬로우 쿼리 로그
CREATE TABLE IF NOT EXISTS `apm_log_app_slow_query` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `executed_at` DATETIME(6) NOT NULL,
    `sql_query` TEXT NOT NULL,
    `execution_time_ms` BIGINT,
    `client_ip` VARCHAR(64),
    `executing_thread` VARCHAR(255),
    INDEX `idx_app_sq_composite` (`app_id`, `executed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SQL 에러 로그
CREATE TABLE IF NOT EXISTS `apm_log_app_sql_error` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `occurred_at` DATETIME(6) NOT NULL,
    `sql_query` TEXT NOT NULL,
    `error_code` VARCHAR(10),
    `sql_state` VARCHAR(5),
    `error_message` TEXT,
    `execution_time_ms` BIGINT,
    `client_ip` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 시스템 내부 로그
CREATE TABLE IF NOT EXISTS `apm_log_sys_internal` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `occurred_at` DATETIME(6) NOT NULL,
    `log_level` VARCHAR(20),
    `logger_name` VARCHAR(255),
    `message` VARCHAR(2000),
    `stack_trace` LONGTEXT,
    INDEX `idx_sys_log_time` (`occurred_at`, `log_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. JVM 메트릭 정보
CREATE TABLE IF NOT EXISTS `apm_metric_app_jvm` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `recorded_at` DATETIME(6) NOT NULL,
    `process_cpu_load` DOUBLE,
    `system_cpu_load` DOUBLE,
    `heap_used_memory` BIGINT,
    `heap_max_memory` BIGINT,
    `gc_collection_count` BIGINT,
    `gc_collection_time` BIGINT,
    `live_thread_count` INT,
    `deadlock_detected` BIT(1),
    INDEX `idx_app_metric_composite` (`app_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 애플리케이션 통계 정보 (요청)
CREATE TABLE IF NOT EXISTS `apm_stat_app_request` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `base_time` DATETIME(6) NOT NULL,
    `total_requests` BIGINT,
    `error_count` BIGINT,
    `avg_tps` DOUBLE,
    `count_under1s` BIGINT,
    `count_under3s` BIGINT,
    `count_under5s` BIGINT,
    `count_over5s` BIGINT,
    `status2xx` BIGINT,
    `status3xx` BIGINT,
    `status4xx` BIGINT,
    `status5xx` BIGINT,
    INDEX `idx_app_stat_req_composite` (`app_id`, `base_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 애플리케이션 통계 정보 (SQL)
CREATE TABLE IF NOT EXISTS `apm_stat_app_sql` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id` BIGINT NOT NULL,
    `base_time` DATETIME(6) NOT NULL,
    `total_execution_count` BIGINT,
    `slow_query_count` BIGINT,
    `total_execution_time_ms` BIGINT,
    INDEX `idx_stat_app_sql_composite` (`app_id`, `base_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
