package com.apm.dashboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 타겟 애플리케이션에서 발생하는 모든 종류의 인시던트(에러/슬로우 쿼리)를 단일 테이블로 통합 관리합니다.
 *
 * incidentType 컬럼으로 데이터의 성격을 구분합니다:
 * - APP_ERROR  : 애플리케이션 예외 발생 (exceptionName, stackTrace, requestUrl 등 활용)
 * - SLOW_QUERY : 슬로우 SQL 발생 (sqlQuery, executionTimeMs 활용)
 * - SQL_ERROR  : SQL 실행 에러 (sqlQuery, errorCode, sqlState, message 활용)
 *
 * 각 타입에 해당하지 않는 컬럼은 NULL로 저장됩니다.
 */
@Entity
@Table(name = "apm_app_incident_log", indexes = {
        @Index(name = "idx_incident_app_time",  columnList = "appId, occurredAt"),
        @Index(name = "idx_incident_type_time", columnList = "incidentType, occurredAt")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppIncidentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 인시던트가 발생한 대상 앱의 식별 ID */
    @Column(nullable = false)
    private Long appId;

    /** 인시던트 유형 (APP_ERROR / SLOW_QUERY / SQL_ERROR) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentType incidentType;

    /** 인시던트 발생 시각 */
    @Column(nullable = false)
    private LocalDateTime occurredAt;

    // ────────────────────────────────────────────────────────────
    // 공통 필드
    // ────────────────────────────────────────────────────────────

    /** 에러 메시지 또는 시스템 알림 메시지 */
    @Column(columnDefinition = "TEXT")
    private String message;

    /** 스택 트레이스 (APP_ERROR, SQL_ERROR에서 사용) */
    @Column(columnDefinition = "LONGTEXT")
    private String stackTrace;

    // ────────────────────────────────────────────────────────────
    // APP_ERROR 전용 필드
    // ────────────────────────────────────────────────────────────

    /** 예외 클래스 이름 (예: java.lang.NullPointerException) */
    private String exceptionName;

    /** 요청이 들어온 HTTP URL */
    private String requestUrl;

    /** HTTP 메서드 (GET, POST 등) */
    private String httpMethod;

    /** 클라이언트 IP (APP_ERROR, SQL 계열에서 공유) */
    private String clientIp;

    /** HTTP 요청 파라미터 */
    @Column(columnDefinition = "TEXT")
    private String requestParams;

    /** HTTP 요청 바디 (용량이 클 수 있어 LONGTEXT) */
    @Column(columnDefinition = "LONGTEXT")
    private String requestBody;

    /** 에러가 발생한 스레드 이름 */
    private String threadName;

    // ────────────────────────────────────────────────────────────
    // SQL 관련 필드 (SLOW_QUERY / SQL_ERROR 공용)
    // ────────────────────────────────────────────────────────────

    /** 실행된 SQL 구문 */
    @Column(columnDefinition = "TEXT")
    private String sqlQuery;

    /** SQL 실행 소요 시간 (ms) */
    private Long executionTimeMs;

    /** DB 에러 코드 (SQL_ERROR 전용) */
    @Column(length = 20)
    private String errorCode;

    /** SQL State 코드 (SQL_ERROR 전용) */
    @Column(length = 10)
    private String sqlState;
}
