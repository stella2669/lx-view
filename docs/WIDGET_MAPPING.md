# Lx-View Widget Mapping Guide

이 문서는 `apm_widget_info` 테이블의 데이터와 프론트엔드 React 컴포넌트가 어떻게 매핑되어 작동하는지 설명하며, 새로운 위젯을 추가하는 개발 절차를 안내합니다.

## 🔗 매핑 아키텍처 (Mapping Architecture)

시스템은 **DB 메타데이터 -> API -> Zustand Store -> Dashboard Layout** 순으로 데이터가 흐르며, 최종적으로 문자열 키(String Key)를 실제 컴포넌트로 변환합니다.

### 1. Database (`apm_widget_info`)
- **`widget_type`**: 가장 중요한 필드입니다. 프론트엔드 코드 내의 컴포넌트 식별자 역할을 합니다. (예: `TransactionFlow`, `XViewChart`)
- **`min_w`, `min_h`**: 대시보드 그리드에서 해당 위젯이 가질 수 있는 최소 격자 크기를 정의합니다.

### 2. Frontend Store (`useDashboardStore.ts`)
- `fetchAvailableWidgets()` 액션을 통해 서버로부터 `isActive=true`인 위젯 리스트를 가져옵니다.
- `addPanel(type)` 호출 시, `availableWidgets`에서 해당 타입을 찾아 `minW`, `minH` 제약 조건을 레이아웃에 주입합니다.

### 3. Dashboard Layout (`DashboardLayout.tsx`)
- 이 파일이 매핑의 **핵심(Registry)** 입니다.
- `PanelComponents` 객체가 `widget_type` 문자열을 실제 React 컴포넌트 클래스/함수와 연결합니다.

```tsx
// DashboardLayout.tsx 내부의 매핑 예시
const PanelComponents: Record<string, React.FC<any>> = {
  TransactionFlow: TransactionFlowComp, // DB의 widget_type이 'TransactionFlow'일 때 매핑
  XViewChart: XViewChartComp,           // DB의 widget_type이 'XViewChart'일 때 매핑
  // ...
};
```

---

## 🚀 새로운 위젯 추가 절차 (Expansion Guide)

새로운 모니터링 차트나 위젯을 시스템에 추가하려면 다음 3단계를 수행하세요.

### STEP 1: React 컴포넌트 소스 작성
1. `frontend/src/components/monitor/` 경로 등에 새로운 차트 컴포넌트를 작성합니다.
2. 예: `NewMetricChart.tsx`

### STEP 2: 프론트엔드 레지스트리 등록
1. `frontend/src/components/dashboard/DashboardLayout.tsx` 파일을 엽니다.
2. 새로 만든 컴포넌트를 `import` 합니다.
3. `PanelComponents` 객체에 새로운 키-값 쌍을 추가합니다.
   ```tsx
   const PanelComponents = {
     // ...기존 매핑
     NewMetric: NewMetricChart, // 'NewMetric'이라는 키로 컴포넌트 등록
   };
   ```

### STEP 3: DB (또는 Settings UI) 등록
1. **방법 A (UI)**: 대시보드 헤더의 `Settings > Widgets` 메뉴 하단의 `Register New Widget` 버튼을 클릭합니다.
   - **Widget Type (Key)**: STEP 2에서 정한 키값 (`NewMetric`)을 정확히 입력합니다.
   - **Min Size**: 해당 위젯의 특성에 맞는 최소 너비와 높이를 입력합니다.
2. **방법 B (SQL)**: `apm_widget_info` 테이블에 수동으로 `INSERT` 문을 실행합니다.

---

> [!IMPORTANT]
> **주의 사항**
> - DB의 `widget_type`과 `DashboardLayout.tsx`의 `PanelComponents` 키값이 **대소문자까지 모두 일치**해야 화면이 정상적으로 렌더링됩니다.
> - 일치하지 않을 경우, 대시보드 화면에서 해당 패널 영역이 빈 상태로 표시되거나 오류가 발생할 수 있습니다.
