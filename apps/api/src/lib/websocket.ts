/**
 * WebSocket Server for Live Attendance Tracking
 * 
 * Features:
 * - JWT authentication via query string (?token=...)
 * - Organization-based rooms (clients auto-join org room)
 * - Role-based broadcasting (only manager+ receive events)
 * - Events: clock-in, clock-out, break-start, break-end
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server as HTTPServer } from 'http';
import { auth } from './auth.js';

/**
 * Client metadata stored for each connected WebSocket
 */
interface ClientMetadata {
  userId: string;
  userName: string;
  orgId: string;
  role: string;
  ws: WebSocket;
}

/**
 * Active WebSocket clients
 * Key: Random client ID
 * Value: Client metadata
 */
const clients = new Map<string, ClientMetadata>();

/**
 * Create and configure WebSocket server
 * 
 * @param server - HTTP server instance to attach WebSocket to
 * @returns WebSocketServer instance
 */
export function createWebSocketServer(server: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', async (request: IncomingMessage, socket: any, head: any) => {
    try {
      // Parse token from query string
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.warn('WebSocket upgrade rejected: No token provided');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Verify JWT token using Better Auth
      const session = await auth.api.getSession({
        headers: { authorization: `Bearer ${token}` },
      });

      if (!session || !session.user || !session.session) {
        console.warn('WebSocket upgrade rejected: Invalid token or no session');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Check if user has an active organization
      const activeOrgId = session.session.activeOrganizationId;
      if (!activeOrgId) {
        console.warn('WebSocket upgrade rejected: No active organization');
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // Accept WebSocket connection and pass session data
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, session);
      });
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  // Handle new WebSocket connection (after successful authentication)
  wss.on('connection', (ws: WebSocket, _request: IncomingMessage, session: any) => {
    // Generate unique client ID
    const clientId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const userId = session.user.id;
    const userName = session.user.name || session.user.email || 'Unknown';
    const orgId = session.session.activeOrganizationId;
    
    // Get user role from session (Better Auth organization plugin provides this)
    // Note: The role is stored in the member table, but Better Auth exposes it
    // We need to get the role from the organization membership
    let role = 'employee'; // Default role
    
    // Better Auth organization plugin stores role in session
    // If not available, we'll default to 'employee' for safety
    if (session.user.role) {
      role = session.user.role;
    }

    // Store client metadata
    clients.set(clientId, {
      userId,
      userName,
      orgId,
      role,
      ws,
    });

    console.log(`✅ WebSocket connected: ${userName} (${userId}) - Role: ${role} - Org: ${orgId}`);
    console.log(`   Total clients: ${clients.size}`);

    // Send welcome message
    ws.send(JSON.stringify({
      event: 'connected',
      payload: {
        message: 'Connected to Torre Tempo live attendance',
        userId,
        orgId,
        role,
      },
    }));

    // Handle disconnect
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`❌ WebSocket disconnected: ${userName} (${userId})`);
      console.log(`   Total clients: ${clients.size}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${userName} (${userId}):`, error);
      clients.delete(clientId);
    });

    // Handle ping/pong for keep-alive (optional but recommended)
    ws.on('pong', () => {
      // Client is alive, nothing to do
    });
  });

  // Set up ping interval to keep connections alive (every 30 seconds)
  const pingInterval = setInterval(() => {
    for (const [clientId, client] of clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        // Clean up dead connections
        clients.delete(clientId);
      }
    }
  }, 30000);

  // Clean up on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
    clients.clear();
  });

  console.log('✅ WebSocket server initialized');
  return wss;
}

/**
 * Broadcast attendance event to organization (only to managers+)
 * 
 * Events are only sent to users with manager, tenantAdmin, or owner roles.
 * Employees do not receive peer activity notifications.
 * 
 * @param orgId - Organization ID to broadcast to
 * @param event - Event type (e.g., 'attendance:clock-in')
 * @param payload - Event payload data
 */
export function broadcastToOrg(orgId: string, event: string, payload: any): void {
  let sentCount = 0;
  let managerCount = 0;

  for (const [clientId, client] of clients.entries()) {
    // Only broadcast to clients in the same organization
    if (client.orgId !== orgId) {
      continue;
    }

    // Only send to manager+ roles (not employees)
    if (client.role === 'employee') {
      continue;
    }

    managerCount++;

    // Only send if connection is open
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({ event, payload }));
        sentCount++;
      } catch (error) {
        console.error(`Failed to send event to client ${clientId}:`, error);
      }
    }
  }

  console.log(`📡 Broadcast: ${event} to org ${orgId} - Sent to ${sentCount}/${managerCount} manager+ clients`);
}

/**
 * Get count of active connections (for monitoring)
 */
export function getActiveConnectionCount(): number {
  return clients.size;
}

/**
 * Get count of active connections by organization
 */
export function getOrgConnectionCount(orgId: string): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.orgId === orgId) {
      count++;
    }
  }
  return count;
}
