# lx-view

**lx-view**는 관제 대상 에이전트(`lx-view-agent`)로부터 수집된 메트릭 데이터를 실시간으로 모니터링하고 분석하기 위한 통합 APM(Application Performance Monitoring) 대시보드 애플리케이션입니다.  
SpringBoot 기반의 백엔드와 React + TypeScript + Vite 기반의 프론트엔드로 구성되어 있습니다.

---

## 📚 가이드 및 문서
- **[시스템 관리자 및 개발자 매뉴얼 (manual.md)](docs/manual.md)**: DB 설정(DDL/DML), 애플리케이션 및 위젯 관리, 위젯 확장 가이드를 포함합니다.

---

## 🚀 기술 스택

### Frontend
| 분류 | 기술 |
|------|------|
| Framework | React 19, TypeScript |
| State Management | Zustand (selector 패턴으로 과도한 리렌더링 차단) |
| Styling | Tailwind CSS v4, Vanilla CSS |
| Data Visualization | Apache ECharts (`echarts-for-react`) |
| Canvas Animation | Custom `CanvasEngine` + `RequestAnimationFrame` (60fps) |
| Layout System | `react-grid-layout` (드래그 & 리사이징 대시보드) |
| Real-time | STOMP over WebSocket (`@stomp/stompjs`) |
| Build Tool | Vite |

### Backend
| 분류 | 기술 |
|------|------|
| Framework | Spring Boot 3.2.3, Java 17 |
| Web | Spring WebFlux (Reactive Stack) |
| Real-time | WebSocket (STOMP Broker) |
| Database | MariaDB + Spring Data JPA |
| Agent Resolver | AppIdResolver (AgentName → ID 매핑 및 관리) |
| Utilities | Lombok |

---

## 📂 프로젝트 구조

```text
lx-view/
├── backend/                     # Spring Boot 애플리케이션 (API 및 WebSocket 서버)
│   └── src/main/java/com/apm/dashboard/
│       ├── config/              # WebSocket, CORS, JPA 설정
│       ├── controller/          # REST API 및 WebSocket 컨트롤러
│       ├── service/             # 비즈니스 로직 (메트릭 집계, 실시간 브로드캐스트)
│       ├── repository/          # JPA 레포지토리 (MariaDB)
│       └── model/               # 데이터 모델 (Transaction, JvmMetrics, SqlLog 등)
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── dashboard/       # 대시보드 레이아웃 시스템
│       │   │   ├── DashboardLayout.tsx       # react-grid-layout 기반 위젯 배치
│       │   │   └── DashboardPanelWrapper.tsx # 편집 모드 오버레이/삭제 UI 공통화
│       │   ├── monitor/         # 개별 모니터링 위젯 컴포넌트들
│       │   │   ├── TransactionFlow.tsx       # 실시간 파티클 애니메이션 (Canvas)
│       │   │   ├── XViewChart.tsx           # 실시간 스캐터 차트 (X-View, Canvas)
│       │   │   ├── ResponseStats.tsx        # 응답시간 도넛 + 정상/에러 바 차트
│       │   │   ├── ActiveServiceChart.tsx   # 활성 서비스 현황 차트
│       │   │   ├── JvmMetrics.tsx          # JVM CPU/Heap/GC/Thread 메트릭
│       │   │   ├── SqlMonitorPanel.tsx      # SQL 모니터링 통합 패널
│       │   │   ├── TopStatsPanels.tsx       # KPI 카드 위젯 5종
│       │   │   ├── UnifiedErrorList.tsx     # 통합 에러 목록
│       │   │   └── TransactionListModal.tsx # 드래그 선택 트랜잭션 팝업
│       │   └── shared/          # 공통 UI 컴포넌트
│       │       ├── BaseChartCard.tsx        # 모든 위젯의 공통 카드 레이아웃
│       │       ├── LayoutDropdown.tsx       # 위젯 추가/제거 드롭다운
│       │       └── ThemeSelector.tsx        # 5가지 테마 선택 UI
│       ├── core/
│       │   ├── renderer/
│       │   │   └── ParticleRenderer.ts      # Canvas 파티클 드로우 유틸리티
│       │   └── math/
│       │       └── CoordinateMath.ts        # X-View 좌표 계산 유틸리티
│       ├── hooks/
│       │   ├── useCanvasEngine.ts           # requestAnimationFrame 기반 캔버스 엔진
│       │   ├── useWebSocket.ts             # STOMP WebSocket 구독 훅
│       │   ├── useChartTheme.ts            # 테마에 반응하는 ECharts 색상 훅
│       │   ├── useChartResize.ts           # ResizeObserver 기반 ECharts 자동 리사이즈
│       │   └── useTransactionDetail.ts     # 트랜잭션 상세 조회 Lazy Load 훅
│       └── store/
│           ├── useStore.ts                 # 전역 주요 상태 (트랜잭션, JVM, 테마)
│           └── useDashboardStore.ts        # 대시보드 레이아웃/패널 상태
│
├── nginx/                       # Nginx 컨테이너 설정
├── docker-compose.yml           # 로컬 Nginx 테스트용 Docker Compose
├── nginx.conf                   # Nginx 프록시 설정
└── .gitignore
```

---

## 🖥️ 주요 기능

### 1. 실시간 데이터 스트리밍
- 에이전트에서 HTTP POST로 전송된 메트릭 배치 데이터를 백엔드에서 수신
- Spring WebSocket + STOMP를 통해 프론트엔드로 즉시 브로드캐스트
- Zustand 스토어의 **Selector 패턴**으로 필요한 컴포넌트만 선택적으로 리렌더링

### 2. 5가지 테마 지원
- **Dark** (기본), **Light**, **Dracula**, **Ocean**, **Solarized Light**
- CSS Custom Properties (`--bg-base`, `--text-accent` 등)를 통해 전체 앱에 일관된 테마 적용
- Canvas 컴포넌트도 테마 변경 시 자동으로 色색상 캐시 갱신

### 3. 커스터마이저블 대시보드 레이아웃
- **Edit Layout** 버튼으로 편집 모드 진입
- 모든 위젯을 **드래그 앤 드롭**으로 자유롭게 위치 변경
- 위젯 우측 하단 핸들로 크기 조절 (48칸 / 25px 행 기준의 세밀한 그리드)
- 위젯 추가 / 삭제 드롭다운 메뉴

### 4. KPI 카드 위젯 (5종)
| 위젯 | 설명 |
|------|------|
| Active Services | 현재 활성 서비스 수 |
| Total Requests | 총 수신 요청 수 |
| Total Errors | 총 에러 건수 |
| TPS | 초당 트랜잭션 수 |
| JVM Threads | JVM 라이브 스레드 수 |

### 5. Transaction Flow (Canvas 애니메이션)
- 실시간 트랜잭션을 **REQ → PROCESSING → RES** 흐름으로 파티클 애니메이션으로 표현
- 각 단계의 파티클 수를 실시간 카운팅하여 표시
- 최대 2,000개의 파티클을 오프스크린 스프라이트 캐싱(Sprite Caching) 방식으로 초당 60fps 렌더링

### 6. X-View 스캐터 차트 (Canvas)
- 최근 5분간 트랜잭션을 시간(X축) × 응답시간(Y축)로 실시간 플로팅
- **마우스 클릭**: 특정 점 선택 → 트랜잭션 상세 팝업 (에러 스택 트레이스 포함)
- **드래그 선택**: 구간 박스를 그려 해당 범위 내 트랜잭션 목록을 팝업으로 조회

### 7. Response Stats (ECharts)
- **도넛 차트**: 응답시간 분포 (< 1s / < 3s / < 5s / > 5s)
- **바 차트**: 정상(Normal) vs 에러(Error) 건수
- 차트 클릭 시 해당 카테고리 트랜잭션 목록 팝업 연동

### 8. SQL 모니터링 패널
- 슬로우 쿼리 Top 50, 최근 에러 쿼리 목록
- SQL 통계 (총 실행 횟수 / 평균 응답시간 / 슬로우 쿼리 수)

### 9. JVM 메트릭 차트
- 실시간 Heap 사용률, CPU Load, GC 횟수/시간, 스레드 수 시계열 라인 차트

### 10. 통합 에러 목록 (UnifiedErrorList)
- 애플리케이션 에러 + SQL 에러를 하나의 테이블에서 통합 조회

---

## ⚡ 성능 최적화 이력

이 프로젝트는 장시간 실행 시 발생하는 렌더링 렉을 근절하기 위해 7단계의 심층 최적화를 거쳤습니다.

| 단계 | 문제 | 해결책 |
|------|------|--------|
| 1 | Layout Thrashing (매 프레임 `getComputedStyle` 호출) | `useRef` 기반 CSS 변수 캐싱, 테마 변경 시에만 갱신 |
| 2 | 메모리 누수 (무제한 트랜잭션 배열 증가) | Hard Cap (최대 20,000건) + 배열 복사 방식 개선 |
| 3 | 과다 리렌더링 (Zustand 전체 스토어 구독) | Selector 패턴으로 컴포넌트별 최소 구독 범위 지정 |
| 4 | 다크 모드 `shadowBlur` 연산 부하 | 오프스크린 캔버스 스프라이트 캐싱 (9종 미리 그리기) |
| 5 | `lighter` 블렌딩 모드 GPU 과부하 | 전체 테마 `source-over` 고정 (하드웨어 가속 최대화) |
| 6 | GC 스파이크 / Stuttering | O(1) 역순 탐색 & Swap-Pop 삭제 + Canvas Native Batching |
| 7 | V8 엔진 마이크로 오버헤드 | 문자열 HashMap → 3D 배열 인덱싱, 이중 루프 병합, 나눗셈 호이스팅 |
| 8 | 서버 사이드 부하 및 데이터 폭증 | 인시던트 중복 제거(Deduplication) 엔진 도입 (30s/10s 윈도우) |

---

## 📡 API 명세

### REST API (프론트엔드 조회용)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/monitor/sql/stats` | 시간 구간 SQL 통계 |
| GET | `/api/v1/monitor/sql/slow/top` | Top 50 슬로우 쿼리 |
| GET | `/api/v1/monitor/sql/slow/recent` | 최근 슬로우/에러 쿼리 |
| GET | `/api/v1/monitor/errors/recent` | 최근 통합 에러 목록 |
| GET | `/api/transactions/history` | 최근 트랜잭션 목록 (차트 초기화용) |

### Agent 데이터 수신 API
`POST /api/v1/metrics/collect` — 배열 형태의 배치 페이로드 수신

#### TRANSACTION 타입
```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "TRANSACTION",
    "txId": "REQ-a1b2c3d4",
    "timestamp": 1735693200000,
    "responseTimeMs": 145,
    "serviceName": "/api/v1/users/login",
    "isError": false,
    "httpStatusCode": 200
  }
]
```

#### JVM 타입
```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "JVM",
    "timestamp": 1735693200000,
    "processCpuLoad": 0.15,
    "heapUsed": 536870912,
    "heapMax": 2147483648,
    "heapUsagePercent": 25.0,
    "gcCount": 12,
    "gcTime": 350,
    "liveThreads": 45,
    "deadlockedThreads": 0
  }
]
```

#### SQL 타입 (SQL Metric & Incident)
에이전트에서 N ms 이상 소요된 쿼리 또는 에러가 발생한 SQL을 전송합니다. 서버 단에서 10초 윈도우로 중복 로그가 제거됩니다.
```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "SQL",
    "txId": "REQ-a1b2c3d4",
    "timestamp": 1735693200000,
    "responseTimeMs": 1250,
    "sql": "SELECT * FROM users WHERE id = ?",
    "isError": false
  }
]
```

#### ERROR_DETAIL 타입
애플리케이션에서 발생한 Exception의 상세 스택트레이스를 전송합니다. 동일 txId의 에러는 30초 윈도우로 중복 저장이 방지됩니다.
```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "ERROR_DETAIL",
    "txId": "REQ-a1b2c3d4",
    "timestamp": 1735693200000,
    "exceptionName": "java.lang.NullPointerException",
    "errorMessage": "Cannot invoke ...",
    "stackTrace": "java.lang.NullPointerException...",
    "requestUrl": "/api/v1/users/login",
    "httpMethod": "POST",
    "clientIp": "127.0.0.1"
  }
]
```

---

## 💻 실행 방법

### 로컬 개발 환경

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173 에서 실행

# Backend
cd backend
./gradlew bootRun    # http://localhost:8080 에서 실행
```

### 운영 환경 배포

```bash
# Backend JAR 빌드
cd backend
./gradlew build -x test
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar

# Frontend 정적 빌드 → Nginx 배포
cd frontend
npm run build        # frontend/dist/ 로 출력
```

#### Nginx 프록시 설정 예시
```nginx
server {
    listen 80;
    server_name 0.0.0.0;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Docker로 로컬 Nginx 테스트

```bash
# 1. 프론트엔드 빌드
cd frontend && npm run build

# 2. 백엔드 실행
cd backend && ./gradlew bootRun

# 3. Nginx 컨테이너 실행
docker-compose up -d nginx
# → http://localhost 에서 확인

docker-compose down  # 종료
```

---

## 📝 Git Workflow

```bash
# 작업 및 커밋
git add .
git commit -m "작업 내용 요약"

# 배포 (dev → prod)
git pull origin dev
git checkout prod
git merge dev
git push origin prod
git checkout dev
```
