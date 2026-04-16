import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { apiFetch } from '../utils/api';
import type { TransactionData, ActiveServiceData, TopStatsData, JvmMetricsData } from '../store/useStore';

// ──────────────────────────────────────────────────────────────────────────────
// WebSocket 토큰 갱신 브릿지 (Token Renewal Bridge)
//
// [갱신 흐름 A — 외부 HTTP 요청에 의한 토큰 갱신]
//   apiFetch → 401 감지 → /api/auth/refresh → updateToken() 호출
//   → useAuthStore의 token 상태 변경
//   → 이 훅의 useEffect 의존성 배열([token])이 감지
//   → 기존 STOMP 클라이언트 deactivate (cleanup)
//   → 새 token으로 STOMP 클라이언트 재생성 + activate
//
// [갱신 흐름 B — WebSocket 연결 중 인증 오류]
//   서버가 STOMP ERROR 프레임 전송
//   → onStompError 에서 auth 관련 메시지 감지
//   → apiFetch 호출로 토큰 갱신 트리거
//   → 갱신 성공 시 흐름 A와 동일하게 재연결
//
// [갱신 흐름 C — 활성화 직전 토큰 최신화]
//   apiFetch 내부에서 토큰이 갱신된 경우, activate() 직전에
//   useAuthStore.getState().token으로 최신 값을 재주입합니다.
// ──────────────────────────────────────────────────────────────────────────────

export const useWebSocket = () => {
    const addTransactions = useStore((state) => state.addTransactions);
    const updateActiveServices = useStore((state) => state.updateActiveServices);
    const setTopStats = useStore((state) => state.setTopStats);
    const setJvmMetrics = useStore((state) => state.setJvmMetrics);

    // token이 변경되면 useEffect가 재실행되어 WebSocket이 재연결됩니다 (흐름 A의 트리거)
    const token = useAuthStore((state) => state.token);

    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        if (!token) {
            console.warn('WebSocket connection aborted: No token available');
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = import.meta.env.VITE_API_BASE_URL
            ? import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '')
            : `${window.location.hostname}:8080`;

        // 클로저 캡처 버그 방지: 로컬 인스턴스로 생성
        const client = new Client({
            brokerURL: `${wsProtocol}//${wsHost}/ws-apm`,
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            onConnect: () => {
                console.log('Connected to WebSocket!');

                client.subscribe('/topic/transactions', (message) => {
                    if (message.body) {
                        const data: TransactionData[] = JSON.parse(message.body);
                        addTransactions(data);
                    }
                });

                client.subscribe('/topic/active-services', (message) => {
                    if (message.body) {
                        const data: ActiveServiceData[] = JSON.parse(message.body);
                        updateActiveServices(data);
                    }
                });

                client.subscribe('/topic/top-stats', (message) => {
                    if (message.body) {
                        const data: TopStatsData = JSON.parse(message.body);
                        setTopStats(data);
                    }
                });

                client.subscribe('/topic/jvm-metrics', (message) => {
                    if (message.body) {
                        const data: JvmMetricsData = JSON.parse(message.body);
                        setJvmMetrics(data);
                    }
                });
            },

            // ── 흐름 B: STOMP 레벨 인증 오류 처리 ──────────────────────────────────
            onStompError: (frame) => {
                const errorMessage = frame.headers['message'] ?? '';
                console.error('[WebSocket] Broker error:', errorMessage, frame.body);

                // 인증 오류 감지: 401 / auth / unauthorized / forbidden 키워드
                const isAuthError = /401|auth|unauthorized|forbidden/i.test(errorMessage)
                    || /401|auth|unauthorized|forbidden/i.test(frame.body ?? '');

                if (isAuthError) {
                    console.warn('[WebSocket] 인증 오류 감지. 토큰 갱신을 시도합니다...');
                    // apiFetch 내부에서 /api/auth/refresh를 호출하여 updateToken() 실행
                    // → useAuthStore의 token이 변경되면 이 useEffect가 재실행되어 재연결됩니다 (흐름 A)
                    apiFetch('/api/transactions/history').catch(() => {
                        // 갱신 실패 시 apiFetch 내부에서 logout()이 호출됩니다
                    });
                }
            },

            onWebSocketError: (event) => {
                console.error('[WebSocket] Connection error:', event);
            },
        });

        let isMounted = true;

        // 흐름 C: HTTP 요청을 먼저 수행하여 토큰 유효성 확인 및 자동 갱신
        // apiFetch 내부에서 토큰이 갱신될 수 있으므로, activate 직전에 최신 토큰을 재주입합니다.
        apiFetch('/api/transactions/history')
            .then(res => res.json())
            .then((data: TransactionData[]) => {
                if (isMounted) {
                    if (data && data.length > 0) {
                        addTransactions(data);
                    }

                    // 활성화 직전 최신 토큰 재주입 (apiFetch 중 갱신된 경우 반영)
                    const latestToken = useAuthStore.getState().token;
                    if (latestToken) {
                        client.connectHeaders = {
                            ...client.connectHeaders,
                            Authorization: `Bearer ${latestToken}`,
                        };
                    }

                    console.log('Activating STOMP client with fresh token...');
                    client.activate();
                }
            })
            .catch(err => {
                console.error('[WebSocket] Failed to load transaction history or refresh token:', err);
                if (isMounted) {
                    client.activate();
                }
            });

        clientRef.current = client;

        return () => {
            isMounted = false;
            // 로컬 인스턴스를 직접 deactivate하여 stale 연결 누수 차단
            client.deactivate();
            if (clientRef.current === client) {
                clientRef.current = null;
            }
        };
    }, [token, addTransactions, updateActiveServices, setTopStats, setJvmMetrics]);
};
