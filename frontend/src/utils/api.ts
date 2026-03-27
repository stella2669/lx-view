import { useAuthStore } from '../store/useAuthStore';

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const { token, refreshToken, updateToken, logout } = useAuthStore.getState();

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  let response = await fetch(url, { ...options, headers });

  // 401 Unauthorized 발생 시 토큰 갱신 시도
  if (response.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: refreshToken, // Backend expected @RequestBody String
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        updateToken(data.accessToken, data.refreshToken);

        // 새 토큰으로 재시도
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
    }
  }

  return response;
};
