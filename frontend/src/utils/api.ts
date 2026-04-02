import { useAuthStore } from '../store/useAuthStore';

let isRefreshing = false;

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const { token, updateToken, logout } = useAuthStore.getState();

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  let response = await fetch(url, { ...options, headers });

  // 401 Unauthorized 발생 시 토큰 갱신 시도
  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // refreshToken은 이제 HttpOnly Cookie로 백엔드에서 자동 전송 및 처리됩니다.
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        // 백엔드에서 반환된 새로운 access token만 스토어에 갱신
        updateToken(data.accessToken);

        // 새 토큰으로 원본 요청 재시도
        const retryHeaders = {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.accessToken}`,
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Refresh 실패 시 로그아웃
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      isRefreshing = false;
    }
  } else if (response.status === 401 && isRefreshing) {
    // 이미 갱신 중인 상태에서 또 401이 발생하면 중복 갱신을 피하고 에러 처리를 위해 일단 그대로 반환
    return response;
  }

  return response;
};
