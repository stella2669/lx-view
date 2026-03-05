# lx-view

**lx-view**는 관제 대상 에이전트(`lx-view-agent`)로부터 수집된 메트릭 데이터를 실시간으로 모니터링하고 분석하기 위한 통합 대시보드 애플리케이션입니다. 
SpringBoot 기반의 백엔드와 React + TypeScript + Vite 기반의 프론트엔드로 구성되어 있습니다.

## 🚀 기술 스택

### Frontend
- **Framework & Library**: React 19, TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS (v4), PostCSS
- **Data Visualization**: ECharts
- **Real-time Communication**: @stomp/stompjs (WebSocket)
- **Build Tool**: Vite

### Backend
- **Framework**: Spring Boot 3.2.3, Java 17
- **Web & API**: WebFlux (Reactive Stack)
- **Real-time Communication**: WebSocket
- **Database / ORM**: MariaDB, Spring Data JPA
- **Monitoring & Logging**: P6Spy (SQL Logging)
- **Utilities**: Lombok

---

## 📂 프로젝트 구조

```text
lx-view/
├── backend/                # Spring Boot 애플리케이션 (API 및 WebSocket 서버)
├── frontend/               # React + Vite 프론트엔드 애플리케이션
│   ├── src/                # 프론트엔드 소스 코드
│   ├── public/             # 정적 리소스
│   ├── package.json        # 프론트엔드 의존성 관리
│   └── vite.config.ts      # Vite 빌드 설정
└── .gitignore              # 최상위 통합 Git 무시 설정
```

---

## 💻 실행 방법

### 로컬 개발 환경

**Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

**Backend (Spring Boot)**
```bash
cd backend
./gradlew bootRun
```

---

### 🚀 운영 환경 적용 (Production)

운영 환경에서는 프론트엔드와 백엔드를 각각 빌드하여 배포합니다.

#### 1. Backend 빌드 및 실행
Spring Boot 백엔드는 실행 가능한 JAR 패키지로 빌드합니다.
```bash
cd backend
# 테스트를 제외하고 빌드 (운영용)
./gradlew build -x test

# 생성된 JAR 파일 실행
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar
```

#### 2. Frontend 빌드 및 서빙
React 프론트엔드는 정적 파일로 빌드한 후 Nginx 등 웹 서버를 통해 서비스합니다.
```bash
cd frontend
npm install
npm run build
```
* 빌드가 완료되면 `frontend/dist` 폴더에 생성되는 파일들을 Nginx의 문서 디렉토리(ex: `/usr/share/nginx/html`)로 배포합니다.

#### 💡 Nginx 설정 예시 (Frontend + Backend Proxy)
프론트엔드 정적 파일 서빙과 백엔드 API/WebSocket(`ws://`) 요청을 한 곳에서 처리하기 위한 Nginx `server` 블록 설정 예시입니다.

```nginx
server {
    listen 80;
    server_name your-domain.com; # 배포할 도메인 또는 IP

    # 1. Frontend 정적 파일 제공
    location / {
        root /usr/share/nginx/html; # frontend/dist 파일이 위치한 경로
        index index.html index.htm;
        try_files $uri $uri/ /index.html; # React Router 새로고침 대응
    }

    # 2. Backend API 및 WebSocket 프록시
    location /api/ {
        proxy_pass http://localhost:8080; # 백엔드 서버 주소 (Spring Boot)
        
        # WebSocket 지원을 위한 헤더 설정
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

### 🐳 로컬에서 운영 환경(Nginx) 구성 테스트하기

Docker를 이용해 자신의 PC에서 실제 배포와 유사하게 Nginx 프록시를 띄워볼 수 있습니다. 프로젝트 루트에 제공된 `docker-compose.yml`과 `nginx.conf`를 활용합니다.

1. **프론트엔드 빌드 (필수)**
   Nginx 용도로 사용할 정적 파일을 먼저 생성해 줍니다.
   ```bash
   cd frontend
   npm run build
   ```
2. **백엔드 서버 켜기**
   Nginx가 백엔드로 프록시를 보낼 수 있도록 터미널에서 Spring Boot 애플리케이션을 구동합니다.
   ```bash
   cd backend
   
   # Windows (Command Prompt / PowerShell)
   .\gradlew.bat bootRun
   
   # Linux / Mac
   ./gradlew bootRun
   ```
3. **Nginx 컨테이너 실행**
   프로젝트 최상위 경로에서 터미널을 열고 다음 명령어를 입력합니다.
   ```bash
   docker-compose up -d nginx
   ```
4. 브라우저에서 `http://localhost` 에 접속하여 프론트엔드 화면이 잘 뜨고, 백엔드 API/WebSocket 통신이 정상적으로 되는지 확인합니다. 확인이 끝나면 `docker-compose down`으로 종료합니다.
    *(주의: 외부 컨테이너(Nginx)에서 로컬 8080 포트를 호출할 때 OS 파워셀이나 방화벽 설정에 따라 `host.docker.internal:8080`으로 `nginx.conf`의 proxy_pass 주소를 변경해야 할 수 있습니다.)*

## 📡 Agent 데이터 수신 명세 (API Specification)

`lx-view-agent`에서 백엔드(`/api/v1/metrics/collect`)로 전송하는 메트릭 배치 배열 JSON 페이로드 예시입니다. 배치 처리를 위해 항상 배열(`[]`) 형태로 전송되어야 합니다.

### 1. TRANSACTION 타입 데이터
웹 요청이나 트랜잭션 종료 시 발생하는 메트릭으로, 응답 속도 및 에러 여부를 측정합니다.

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
*(참고: `txId` 누락 시 백엔드에서 UUID를 자동 부여하지만, 트랜잭션 추적을 위해 Agent에서 생성하여 전송하는 것을 권장합니다.)*

### 2. JVM 타입 데이터
일정 주기마다 수집되는 JVM 논리/물리적 상태(CPU, 메모리, 스레드 등) 스냅샷 데이터입니다.

```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "JVM",
    "timestamp": 1735693200000,
    "processCpuLoad": 0.15,
    "systemCpuLoad": 0.45,
    "heapUsed": 536870912,
    "heapMax": 2147483648,
    "heapCommitted": 1073741824,
    "heapUsagePercent": 25.0,
    "gcCount": 12,
    "gcTime": 350,
    "liveThreads": 45,
    "deadlockedThreads": 0
  }
]
```

### 3. 배치 전송 예시 (권장)
네트워크 I/O 최적화를 위해 여러 건, 여러 타입의 메트릭을 하나의 배열에 혼합하여 주기적으로 전송합니다.

```json
[
  {
    "agentName": "lx-agent-prod-01",
    "type": "JVM",
    "timestamp": 1735693200000,
    "processCpuLoad": 0.15
  },
  {
    "agentName": "lx-agent-prod-01",
    "type": "TRANSACTION",
    "txId": "REQ-1111",
    "timestamp": 1735693200500,
    "responseTimeMs": 420,
    "serviceName": "/api/v1/orders",
    "isError": true,
    "httpStatusCode": 500
  }
]
```

---

## 📈 주요 기능

- **실시간 메트릭 모니터링**: 에이전트에서 전송하는 배치 배열 데이터를 실시간으로 수신받아 ECharts를 활용해 시각화
- **Transaction Flow Theming**: 라이트/다크 모드 등 테마 설정 지원
- **동적 파티클 및 애니메이션 UI**: 직관적이고 상태를 쉽게 파악할 수 있는 다이나믹 모니터링 UI

---

## 📝 통합 버전 관리 (Git Workflow)

1. **작업 및 커밋**
   ```bash
   git add .
   git commit -m "작업 내용 요약"
   ```
2. **배포 (dev -> prod)**
   ```bash
   git pull origin dev
   git checkout prod
   git merge dev
   git push origin prod
   git checkout dev
   ```

*상세한 Git Workflow는 [설명서(또는 내부 가이드)]를 참고하세요.*
