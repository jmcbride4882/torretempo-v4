/**
 * useWebSocket Hook
 * Manages WebSocket connection for live attendance tracking
 * Auto-reconnects with exponential backoff
 */

import * as React from 'react';
import { useAuth } from './useAuth';
import { authClient } from '@/lib/auth-client';

// ============================================================================
// Types
// ============================================================================

export interface AttendanceEntry {
  userId: string;
  userName: string;
  clockInTime: string;
  location?: string;
  isOnBreak: boolean;
  breakStartTime?: string;
}

export interface WebSocketMessage {
  event: string;
  payload: {
    userId?: string;
    userName?: string;
    timestamp?: string;
    location?: string;
    message?: string;
    orgId?: string;
    role?: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  attendanceData: Map<string, AttendanceEntry>;
  clockedInCount: number;
  onBreakCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

// ============================================================================
// Hook
// ============================================================================

export function useWebSocket(): UseWebSocketReturn {
  const { isAuthenticated } = useAuth();
  
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('disconnected');
  const [attendanceData, setAttendanceData] = React.useState<Map<string, AttendanceEntry>>(new Map());
  
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = React.useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = React.useRef(true);

  // Get WebSocket URL from API URL
  const getWebSocketUrl = React.useCallback(async (): Promise<string | null> => {
    try {
      // Get session to extract token
      const session = await authClient.getSession();
      if (!session?.data?.session) {
        console.warn('No session available for WebSocket connection');
        return null;
      }

      // Better Auth stores the token in the session
      // We need to get a fresh token for WebSocket auth
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const wsUrl = baseUrl.replace(/^http/, 'ws');
      
      // For Better Auth, we use the session token
      // The token is typically available via cookies, but for WebSocket we need query param
      // We'll use a workaround: fetch a short-lived token from the API
      const tokenResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
        credentials: 'include',
      });
      
      if (!tokenResponse.ok) {
        console.warn('Failed to get session for WebSocket');
        return null;
      }

      const sessionData = await tokenResponse.json();
      const token = sessionData?.session?.token || sessionData?.token;
      
      if (!token) {
        // Fallback: use session ID as token (Better Auth may accept this)
        const sessionId = session.data.session.id;
        return `${wsUrl}?token=${sessionId}`;
      }
      
      return `${wsUrl}?token=${token}`;
    } catch (error) {
      console.error('Error getting WebSocket URL:', error);
      return null;
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = React.useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.event) {
        case 'connected':
          console.log('WebSocket connected:', message.payload.message);
          break;
          
        case 'attendance:clock-in':
          if (message.payload.userId && message.payload.userName) {
            setAttendanceData(prev => {
              const next = new Map(prev);
              next.set(message.payload.userId!, {
                userId: message.payload.userId!,
                userName: message.payload.userName!,
                clockInTime: message.payload.timestamp || new Date().toISOString(),
                location: message.payload.location,
                isOnBreak: false,
              });
              return next;
            });
          }
          break;
          
        case 'attendance:clock-out':
          if (message.payload.userId) {
            setAttendanceData(prev => {
              const next = new Map(prev);
              next.delete(message.payload.userId!);
              return next;
            });
          }
          break;
          
        case 'attendance:break-start':
          if (message.payload.userId) {
            setAttendanceData(prev => {
              const next = new Map(prev);
              const entry = next.get(message.payload.userId!);
              if (entry) {
                next.set(message.payload.userId!, {
                  ...entry,
                  isOnBreak: true,
                  breakStartTime: message.payload.timestamp || new Date().toISOString(),
                });
              }
              return next;
            });
          }
          break;
          
        case 'attendance:break-end':
          if (message.payload.userId) {
            setAttendanceData(prev => {
              const next = new Map(prev);
              const entry = next.get(message.payload.userId!);
              if (entry) {
                next.set(message.payload.userId!, {
                  ...entry,
                  isOnBreak: false,
                  breakStartTime: undefined,
                });
              }
              return next;
            });
          }
          break;
          
        default:
          console.log('Unknown WebSocket event:', message.event);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  // Connect to WebSocket
  const connect = React.useCallback(async () => {
    if (!mountedRef.current) return;
    
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('connecting');
    
    const wsUrl = await getWebSocketUrl();
    if (!wsUrl) {
      setConnectionStatus('error');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY; // Reset delay on successful connection
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (mountedRef.current) {
          setConnectionStatus('error');
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (!mountedRef.current) return;
        
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (event.code !== 1000) { // 1000 = normal closure
          const delay = reconnectDelayRef.current;
          console.log(`Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [getWebSocketUrl, handleMessage]);

  // Connect when authenticated
  React.useEffect(() => {
    mountedRef.current = true;
    
    if (isAuthenticated) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      
      // Clean up
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  // Calculate counts
  const clockedInCount = attendanceData.size;
  const onBreakCount = Array.from(attendanceData.values()).filter(e => e.isOnBreak).length;

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    attendanceData,
    clockedInCount,
    onBreakCount,
  };
}
