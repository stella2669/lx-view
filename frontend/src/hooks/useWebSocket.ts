import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { apiFetch } from '../utils/api';
import type { TransactionData, ActiveServiceData, TopStatsData, JvmMetricsData } from '../store/useStore';

export const useWebSocket = () => {
    const addTransactions = useStore((state) => state.addTransactions);
    const updateActiveServices = useStore((state) => state.updateActiveServices);
    const setTopStats = useStore((state) => state.setTopStats);
    const setJvmMetrics = useStore((state) => state.setJvmMetrics);
    
    // JWT Token for WebSocket Auth
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

        // Local instance to avoid closure capture issues
        const client = new Client({
            brokerURL: `${wsProtocol}//${wsHost}/ws-apm`,
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: `Bearer ${token}`, // initial capture
            },
            onConnect: () => {
                console.log('Connected to WebSocket!');
                // ... subscriptions ...
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
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        let isMounted = true;
        
        // 토큰 유효성 확인(apiFetch를 통한 자동 갱신 포함) 후 활성화
        apiFetch(`/api/transactions/history`)
            .then(res => res.json())
            .then((data: TransactionData[]) => {
                if (isMounted) {
                    if (data && data.length > 0) {
                        addTransactions(data);
                    }
                    
                    // Final check: Inject LATEST token from store right before activation
                    // This handles cases where token was refreshed inside the apiFetch run.
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
                console.error('Failed to load transaction history or refresh token:', err);
                if (isMounted) {
                    client.activate();
                }
            });

        clientRef.current = client;

        return () => {
            isMounted = false;
            // IMPORTANT: Deactivate this local instance directly to ensure STALE attempts are stopped
            client.deactivate();
            if (clientRef.current === client) {
                clientRef.current = null;
            }
        };
    }, [token, addTransactions, updateActiveServices, setTopStats, setJvmMetrics]);
};
