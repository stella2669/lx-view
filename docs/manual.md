# Lx-View 시스템 관리자 및 개발자 매뉴얼

이 문서는 Lx-View 플랫폼의 데이터베이스 설정, 애플리케이션 관리, 그리고 동적 위젯 시스템에 대한 통합 가이드를 제공합니다.

---

## 1. 데이터베이스 설정 (Database Setup)

시스템 가동을 위해 아래의 DDL과 기초 데이터를 데이터베이스에 적용해야 합니다.

### 1-1. DDL (Table Schema)
```sql
-- 1. 애플리케이션 정보 테이블
CREATE TABLE `apm_app_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `app_key` VARCHAR(255) NOT NULL UNIQUE COMMENT '고유 식별 키 (예: PAYMENT-SERVICE)',
  `app_name` VARCHAR(255) DEFAULT NULL COMMENT '대시보드 표시용 명칭',
  `app_type` VARCHAR(50) DEFAULT NULL COMMENT '개발 언어/프레임워크 타입',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '사용 여부 (1:활성, 0:비활성)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 위젯 관리 테이블
CREATE TABLE `apm_widget_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `widget_type` VARCHAR(255) NOT NULL UNIQUE COMMENT 'React 컴포넌트 매핑 키',
  `label` VARCHAR(255) NOT NULL COMMENT '메뉴에 표시될 이름',
  `description` VARCHAR(1000) DEFAULT NULL COMMENT '위젯 상세 설명',
  `min_w` INT DEFAULT 4 COMMENT '그리드 최소 너비',
  `min_h` INT DEFAULT 4 COMMENT '그리드 최소 높이',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '메뉴 노출 여부 (1:노출, 0:숨김)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1-2. 기초 데이터 (Initial Data - DML)
대시보드에서 즉시 사용할 수 있는 기본 위젯 12개에 대한 데이터입니다.
```sql
INSERT INTO apm_widget_info (widget_type, label, description, min_w, min_h, is_active, created_at) VALUES
('TransactionFlow', 'Transaction Flow', '트랜잭션 흐름도', 12, 12, 1, NOW()),
('ResponseStats', 'Response Stats', '응답 시간 통계', 8, 8, 1, NOW()),
('XViewChart', 'X-View', '실시간 트랜잭션 분포', 16, 16, 1, NOW()),
('ActiveServiceChart', 'Active Services', '활성 서비스 현황', 8, 8, 1, NOW()),
('JvmMetrics', 'JVM Metrics', 'CPU, Memory, GC 통계', 12, 12, 1, NOW()),
('SqlMonitorPanel', 'SQL Monitor', 'DB SQL 통계 및 에러', 16, 12, 1, NOW()),
('UnifiedErrorList', 'System Errors', '실시간 시스템 에러', 12, 12, 1, NOW()),
('KpiActiveService', 'KPI: Active Services', '활성 서비스 수치 카드', 4, 4, 1, NOW()),
('KpiTotalRequest', 'KPI: Total Requests', '총 요청 수치 카드', 4, 4, 1, NOW()),
('KpiTotalError', 'KPI: Total Errors', '에러 수치 카드', 4, 4, 1, NOW()),
('KpiTps', 'KPI: TPS', '초당 트랜잭션 수치 카드', 4, 4, 1, NOW()),
('KpiJvmThread', 'KPI: JVM Threads', 'JVM 쓰레드 수치 카드', 4, 4, 1, NOW());
```

---

## 2. 통합 설정 관리 (Settings Management)

시스템 우측 상단의 **Settings** 버튼을 통해 애플리케이션과 위젯을 실시간으로 관리할 수 있습니다.

### 2-1. Applications 관리
- **App Key 등록**: 에이전트로부터 전달받는 `appKey`를 등록해야만 데이터 수집이 시작됩니다.
- **Active 여부**: 비활성화 시 해당 앱의 모든 매트릭 수집이 중단됩니다.
- **Search**: 실시간 DB 조회를 통해 등록된 앱을 검색할 수 있습니다.

### 2-2. Widgets 관리
- **Status (Active/Inactive)**: 위젯을 비활성화하면 대시보드 편집 모드의 "Add Widget" 메뉴에서 해당 위젯이 사라집니다.
- **Min Size 제약**: 각 위젯이 대시보드 내에서 가질 수 있는 최소 크기(너비, 높이)를 강제합니다.

---

## 3. 개발자 가이드: 위젯 매핑 및 확장

새로운 위젯을 시스템에 추가하려면 다음 절차를 따르세요.

### 🔗 매핑 원리
시스템은 **DB의 `widget_type` 값**을 키(Key)로 사용하여 프론트엔드의 React 컴포넌트를 렌더링합니다.

1. **DashboardLayout.tsx**: `PanelComponents` 객체 내에 `widget_type`과 실제 컴포넌트 변수를 매핑합니다.
   ```tsx
   const PanelComponents = {
     MyNewChart: NewChartComponent, // 'MyNewChart'가 DB 연동 키가 됨
   };
   ```

### 🚀 위젯 추가 STEP
1. **Source**: `frontend/src/components/monitor/`에 차트 컴포넌트를 작성합니다.
2. **Registry**: `DashboardLayout.tsx`에서 컴포넌트를 `import` 하고 `PanelComponents`에 키를 등록합니다.
3. **Register**: **Settings > Widgets** UI에서 앞서 정한 키값을 입력하여 위젯을 최종 등록합니다.

---

> [!WARNING]
> **주의 사항**
> - DB의 `widget_type`과 소스 코드의 매핑 키는 **대소문자까지 정확히 일치**해야 합니다.
> - 불일치 시 대시보드에서 해당 패널이 빈 상태로 표시될 수 있습니다.
