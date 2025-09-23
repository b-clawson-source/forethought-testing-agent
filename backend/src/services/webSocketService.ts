import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './loggerService';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  metadata: {
    connectedAt: Date;
    lastPing?: Date;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: Date;
  clientId?: string;
}

export class WebSocketService {
  private clients = new Map<string, WebSocketClient>();
  private logger = LoggerService.getInstance();
  private pingInterval: NodeJS.Timeout;

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, request) => {
      const clientId = uuidv4();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        metadata: {
          connectedAt: new Date(),
          userAgent: request.headers['user-agent'],
          ipAddress: request.socket.remoteAddress
        }
      };

      this.clients.set(clientId, client);
      this.logger.info(`WebSocket client connected: ${clientId}`, {
        clientCount: this.clients.size,
        userAgent: client.metadata.userAgent,
        ipAddress: client.metadata.ipAddress
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        data: { clientId },
        timestamp: new Date()
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          this.logger.error(`Invalid WebSocket message from client ${clientId}`, error);
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid message format' },
            timestamp: new Date()
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for client ${clientId}`, error);
        this.handleClientDisconnect(clientId);
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.metadata.lastPing = new Date();
        }
      });
    });

    this.logger.info('WebSocket server initialized');
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    this.logger.debug(`WebSocket message from ${clientId}`, { type: message.type });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.data?.channels || []);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data?.channels || []);
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: new Date()
        });
        break;

      case 'get_status':
        this.sendServerStatus(clientId);
        break;

      default:
        this.logger.warn(`Unknown WebSocket message type: ${message.type} from ${clientId}`);
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: new Date()
        });
        break;
    }
  }

  private handleSubscription(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    channels.forEach(channel => {
      client.subscriptions.add(channel);
    });

    this.logger.debug(`Client ${clientId} subscribed to channels`, { channels });

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channels, totalSubscriptions: client.subscriptions.size },
      timestamp: new Date()
    });
  }

  private handleUnsubscription(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    this.logger.debug(`Client ${clientId} unsubscribed from channels`, { channels });

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: { channels, totalSubscriptions: client.subscriptions.size },
      timestamp: new Date()
    });
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    const connectionDuration = Date.now() - client.metadata.connectedAt.getTime();
    
    this.logger.info(`WebSocket client disconnected: ${clientId}`, {
      connectionDurationMs: connectionDuration,
      subscriptionCount: client.subscriptions.size,
      clientCount: this.clients.size - 1
    });

    this.clients.delete(clientId);
  }

  private sendServerStatus(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    const status = {
      connectedClients: this.clients.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      clientInfo: {
        id: clientId,
        connectedAt: client.metadata.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        lastPing: client.metadata.lastPing
      }
    };

    this.sendToClient(clientId, {
      type: 'status',
      data: status,
      timestamp: new Date()
    });
  }

  // Public methods for sending messages
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageWithClientId = { ...message, clientId };
      client.ws.send(JSON.stringify(messageWithClientId));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to client ${clientId}`, error);
      this.handleClientDisconnect(clientId);
      return false;
    }
  }

  public broadcastToAll(type: string, data?: any): number {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date()
    };

    let successCount = 0;
    this.clients.forEach((client, clientId) => {
      if (this.sendToClient(clientId, message)) {
        successCount++;
      }
    });

    this.logger.debug(`Broadcast message sent`, {
      type,
      totalClients: this.clients.size,
      successfulSends: successCount
    });

    return successCount;
  }

  public broadcastToChannel(channel: string, type: string, data?: any): number {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date()
    };

    let successCount = 0;
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        if (this.sendToClient(clientId, message)) {
          successCount++;
        }
      }
    });

    this.logger.debug(`Channel broadcast sent`, {
      channel,
      type,
      subscribedClients: successCount,
      totalClients: this.clients.size
    });

    return successCount;
  }

  public sendConversationUpdate(sessionId: string, update: any): void {
    this.broadcastToChannel(`conversation:${sessionId}`, 'conversation_update', {
      sessionId,
      ...update
    });
  }

  public sendTestResults(testId: string, results: any): void {
    this.broadcastToChannel(`test:${testId}`, 'test_results', {
      testId,
      results
    });
  }

  public sendLLMMetrics(metrics: any): void {
    this.broadcastToChannel('metrics:llm', 'llm_metrics', metrics);
  }

  public sendPolicyAlert(alert: any): void {
    this.broadcastToChannel('alerts:policy', 'policy_alert', alert);
  }

  // Connection management methods
  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  public getClientInfo(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): Array<{ id: string; metadata: WebSocketClient['metadata']; subscriptionCount: number }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      metadata: client.metadata,
      subscriptionCount: client.subscriptions.size
    }));
  }

  public disconnectClient(clientId: string, reason?: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    if (reason) {
      this.sendToClient(clientId, {
        type: 'disconnect',
        data: { reason },
        timestamp: new Date()
      });
    }

    client.ws.close(1000, reason);
    return true;
  }

  // Health check and maintenance
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds
  }

  private pingClients(): void {
    const now = new Date();
    let deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.ping();
        } catch (error) {
          this.logger.error(`Failed to ping client ${clientId}`, error);
          deadClients.push(clientId);
        }
      } else {
        deadClients.push(clientId);
      }

      // Check for stale connections (no pong response in 60 seconds)
      if (client.metadata.lastPing && 
          now.getTime() - client.metadata.lastPing.getTime() > 60000) {
        this.logger.warn(`Client ${clientId} appears to be stale, disconnecting`);
        deadClients.push(clientId);
      }
    });

    // Clean up dead clients
    deadClients.forEach(clientId => {
      this.handleClientDisconnect(clientId);
    });

    if (deadClients.length > 0) {
      this.logger.info(`Cleaned up ${deadClients.length} dead WebSocket connections`);
    }
  }

  public getHealthStatus(): {
    isHealthy: boolean;
    connectedClients: number;
    averageConnectionAge: number;
    totalSubscriptions: number;
  } {
    const now = Date.now();
    let totalConnectionAge = 0;
    let totalSubscriptions = 0;

    this.clients.forEach(client => {
      totalConnectionAge += now - client.metadata.connectedAt.getTime();
      totalSubscriptions += client.subscriptions.size;
    });

    const averageConnectionAge = this.clients.size > 0 
      ? totalConnectionAge / this.clients.size 
      : 0;

    return {
      isHealthy: true,
      connectedClients: this.clients.size,
      averageConnectionAge,
      totalSubscriptions
    };
  }

  // Shutdown and cleanup
  public close(): void {
    this.logger.info('Shutting down WebSocket service...');

    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Notify all clients of shutdown
    this.broadcastToAll('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date()
    });

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      try {
        client.ws.close(1001, 'Server shutdown');
      } catch (error) {
        this.logger.error(`Error closing connection for client ${clientId}`, error);
      }
    });

    // Clear clients map
    this.clients.clear();

    this.logger.info('WebSocket service shutdown complete');
  }

  // Utility methods for specific use cases
  public notifyConversationStart(sessionId: string): void {
    this.broadcastToAll('conversation_started', { sessionId });
  }

  public notifyConversationEnd(sessionId: string, analysis?: any): void {
    this.broadcastToAll('conversation_ended', { sessionId, analysis });
  }

  public notifyTestScenarioProgress(scenarioId: string, progress: number, status: string): void {
    this.broadcastToChannel(`scenario:${scenarioId}`, 'scenario_progress', {
      scenarioId,
      progress,
      status
    });
  }

  public notifySystemAlert(level: 'info' | 'warning' | 'error', message: string, details?: any): void {
    this.broadcastToChannel('system:alerts', 'system_alert', {
      level,
      message,
      details,
      timestamp: new Date()
    });
  }
}