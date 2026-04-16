-- LX-View Initial Database Schema (MariaDB)
-- 엔티티 클래스 기준으로 작성된 초기 스키마

-- ──────────────────────────────────────────────
-- 1. apm_user (User)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_user` (
    `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
    `username`   VARCHAR(255) NOT NULL UNIQUE,
    `password`   VARCHAR(255) NOT NULL,
    `role`       VARCHAR(255) NULL,
    `created_at` DATETIME(6)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 2. apm_refresh_token (RefreshToken)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_refresh_token` (
    `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     BIGINT       NOT NULL,
    `token`       VARCHAR(255) NOT NULL UNIQUE,
    `expiry_date` DATETIME(6)  NOT NULL,
    `is_revoked`  BIT(1)       NOT NULL DEFAULT 0,
    `created_at`  DATETIME(6)  NOT NULL,
    CONSTRAINT `fk_refresh_token_user`
        FOREIGN KEY (`user_id`) REFERENCES `apm_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 3. apm_app_info (AppInfo)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_app_info` (
    `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_key`    VARCHAR(255) NOT NULL UNIQUE,
    `app_name`   VARCHAR(255) NULL,
    `app_type`   VARCHAR(255) NULL,
    `is_active`  BIT(1)       NOT NULL DEFAULT 1,
    `created_at` DATETIME(6)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 4. apm_widget_info (WidgetInfo)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_widget_info` (
    `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `widget_type` VARCHAR(255) NOT NULL UNIQUE,
    `label`       VARCHAR(255) NOT NULL,
    `description` TEXT         NULL,
    `is_active`   BIT(1)       NOT NULL DEFAULT 1,
    `min_w`       INT          NULL,
    `min_h`       INT          NULL,
    `created_at`  DATETIME(6)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 5. apm_dashboard_layout (DashboardLayout)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_dashboard_layout` (
    `id`           BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id`      VARCHAR(255) NOT NULL UNIQUE,
    `panels_json`  TEXT         NULL,
    `layouts_json` TEXT         NULL,
    `updated_at`   DATETIME(6)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 6. apm_app_incident_log (AppIncidentLog)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_app_incident_log` (
    `id`               BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id`           BIGINT      NOT NULL,
    `incident_type`    VARCHAR(20) NOT NULL COMMENT 'APP_ERROR | SLOW_QUERY | SQL_ERROR',
    `occurred_at`      DATETIME(6) NOT NULL,

    -- 공통
    `tx_id`            VARCHAR(64)  NULL,
    `message`          TEXT         NULL,
    `stack_trace`      LONGTEXT     NULL,

    -- APP_ERROR 전용
    `exception_name`   VARCHAR(255) NULL,
    `request_url`      VARCHAR(255) NULL,
    `http_method`      VARCHAR(10)  NULL,
    `client_ip`        VARCHAR(64)  NULL,
    `request_params`   TEXT         NULL,
    `request_body`     LONGTEXT     NULL,
    `thread_name`      VARCHAR(255) NULL,

    -- SQL 관련 (SLOW_QUERY / SQL_ERROR)
    `sql_query`         TEXT         NULL,
    `execution_time_ms` BIGINT       NULL,
    `error_code`        VARCHAR(20)  NULL,
    `sql_state`         VARCHAR(10)  NULL,

    INDEX `idx_incident_app_time`  (`app_id`, `occurred_at`),
    INDEX `idx_incident_type_time` (`incident_type`, `occurred_at`),
    INDEX `idx_incident_tx_id`     (`tx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 7. apm_app_metric_jvm (AppMetricJvm)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_app_metric_jvm` (
    `id`                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id`              BIGINT      NOT NULL,
    `recorded_at`         DATETIME(6) NOT NULL,
    `process_cpu_load`    DOUBLE      NULL,
    `system_cpu_load`     DOUBLE      NULL,
    `heap_used_memory`    BIGINT      NULL,
    `heap_max_memory`     BIGINT      NULL,
    `gc_collection_count` BIGINT      NULL,
    `gc_collection_time`  BIGINT      NULL,
    `live_thread_count`   INT         NULL,
    `deadlock_detected`   BIT(1)      NULL,

    INDEX `idx_app_metric_composite` (`app_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 8. apm_app_stat_sql (AppStatSql)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_app_stat_sql` (
    `id`                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id`                 BIGINT      NOT NULL,
    `base_time`              DATETIME(6) NOT NULL,
    `total_execution_count`  BIGINT      NULL,
    `slow_query_count`       BIGINT      NULL,
    `total_execution_time_ms` BIGINT     NULL,

    INDEX `idx_stat_app_sql_composite` (`app_id`, `base_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 9. apm_app_stat_request (AppStatRequest)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_app_stat_request` (
    `id`             BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app_id`         BIGINT      NOT NULL,
    `base_time`      DATETIME(6) NOT NULL,
    `total_requests` BIGINT      NULL,
    `error_count`    BIGINT      NULL,
    `avg_tps`        DOUBLE      NULL,
    `count_under1s`  BIGINT      NULL,
    `count_under3s`  BIGINT      NULL,
    `count_under5s`  BIGINT      NULL,
    `count_over5s`   BIGINT      NULL,
    `status2xx`      BIGINT      NULL,
    `status3xx`      BIGINT      NULL,
    `status4xx`      BIGINT      NULL,
    `status5xx`      BIGINT      NULL,

    INDEX `idx_app_stat_req_composite` (`app_id`, `base_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 10. apm_log_sys_internal (LogSysInternal)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apm_log_sys_internal` (
    `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `occurred_at` DATETIME(6)   NOT NULL,
    `log_level`   VARCHAR(255)  NULL,
    `logger_name` VARCHAR(255)  NULL,
    `message`     VARCHAR(255)  NULL,
    `stack_trace` LONGTEXT      NULL,

    INDEX `idx_sys_log_time` (`occurred_at`, `log_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
