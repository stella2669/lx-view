import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useStore } from '../store/useStore';
import type { TransactionData, ActiveServiceData, TopStatsData, JvmMetricsData } from '../store/useStore';

export const useWebSocket = () => {
    const { addTransactions, updateActiveServices, setTopStats, setJvmMetrics } = useStore();
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        // Recover 5-minute history from backend on initial mount/refresh
        fetch('http://localhost:8080/api/transactions/history')
            .then(res => res.json())
            .then((data: TransactionData[]) => {
                if (data && data.length > 0) {
                    addTransactions(data);
                }
            })
            .catch(err => console.error('Failed to load transaction history:', err));

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws-apm',
            reconnectDelay: 5000,
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
