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
        // Recover history using authenticated apiFetch
        apiFetch(`/api/transactions/history`)
            .then(res => res.json())
            .then((data: TransactionData[]) => {
                if (data && data.length > 0) {
                    addTransactions(data);
                }
            })
            .catch(err => console.error('Failed to load transaction history:', err));

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = import.meta.env.VITE_API_BASE_URL 
            ? import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '')
            : `${window.location.hostname}:8080`;
            
        const client = new Client({
            brokerURL: `${wsProtocol}//${wsHost}/ws-apm`,
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: token ? `Bearer ${token}` : '',
            },
            onConnect: () => {
                console.log('Connected to WebSocket!');

                // Subscribe to transactions
                client.subscribe('/topic/transactions', (message) => {
                    if (message.body) {
                        const data: TransactionData[] = JSON.parse(message.body);
                        addTransactions(data);
                    }
                });

                // Subscribe to active services
                client.subscribe('/topic/active-services', (message) => {
                    if (message.body) {
                        const data: ActiveServiceData[] = JSON.parse(message.body);
                        updateActiveServices(data);
                    }
                });

                // Subscribe to top stats
                client.subscribe('/topic/top-stats', (message) => {
                    if (message.body) {
                        const data: TopStatsData = JSON.parse(message.body);
                        setTopStats(data);
                    }
                });

                // Subscribe to jvm metrics
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

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [addTransactions, updateActiveServices, setTopStats]);
};
