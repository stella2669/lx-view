package com.apm.dashboard.model.entity;

/**
 * AppIncidentLog의 인시던트 유형을 구분하는 열거형(Enum)입니다.
 *
 * - APP_ERROR  : 타겟 애플리케이션에서 발생한 Java 예외 (RuntimeException 등)
 * - SLOW_QUERY : 임계시간을 초과한 SQL 슬로우 쿼리 (에러 없이 응답 지연)
 * - SQL_ERROR  : SQL 실행 중 발생한 DB 에러 (구문 오류, 제약 조건 위반 등)
 */
public enum IncidentType {
    APP_ERROR,
    SLOW_QUERY,
    SQL_ERROR
}
