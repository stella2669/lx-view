import { create } from 'zustand';

// ──────────────────────────────────────────────────────────────────────────────
// 보안 마이그레이션: localStorage(persist) → In-Memory + HttpOnly Cookie
//
// [변경 이유]
//   localStorage에 저장된 JWT Access Token은 XSS 공격으로 탈취될 수 있습니다.
//
// [새로운 구조]
//   - Access Token : Zustand 메모리(JS 변수)에만 보관 — 페이지 새로고침 시 휘발
//   - Refresh Token: 백엔드가 HttpOnly Cookie로 관리 — JS에서 접근 불가 (XSS 차단)
//   - 세션 복원   : 앱 초기화 시 /api/auth/refresh 호출로 Cookie의 Refresh Token을
//                   서버가 검증 후 새 Access Token을 응답 → 메모리에 적재
// ──────────────────────────────────────────────────────────────────────────────

// 구버전 localStorage 잔존 데이터 일회성 정리 (이전 persist 버전 마이그레이션)
if (typeof window !== 'undefined') {
  localStorage.removeItem('apm-auth-storage');
}

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  /** 앱 마운트 시 세션 복원 완료 여부. false인 동안은 로딩 화면을 표시합니다. */
  isInitialized: boolean;

  setAuth: (token: string, username: string, role: string) => void;
  updateToken: (token: string) => void;
  logout: () => void;
  /**
   * 앱 초기화 시 호출. HttpOnly Cookie의 Refresh Token을 사용하여
   * 서버에서 새 Access Token을 발급받아 메모리에 적재합니다.
   * 페이지 새로고침 후에도 로그인 상태를 유지하는 핵심 메커니즘입니다.
   */
  tryRestoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  username: null,
  role: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (token, username, role) => set({
    token,
    username,
    role,
    isAuthenticated: true,
  }),

  updateToken: (token) => set({ token }),

  logout: () => set({
    token: null,
    username: null,
    role: null,
    isAuthenticated: false,
  }),

  tryRestoreSession: async () => {
    try {
      // credentials: 'include'를 통해 HttpOnly Cookie가 자동 전송됩니다.
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({
          token: data.accessToken,
          username: data.username,
          role: data.role,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        // Refresh Token 없음 or 만료 → 미인증 상태로 초기화 완료
        set({ isInitialized: true });
      }
    } catch {
      // 네트워크 오류 등 — 미인증 상태로 초기화 완료
      set({ isInitialized: true });
    }
  },
}));
