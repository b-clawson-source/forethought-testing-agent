"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const loggerService_1 = require("./loggerService");
class WebSocketService {
    constructor(wss) {
        this.wss = wss;
        this.clients = new Map();
        this.logger = loggerService_1.LoggerService.getInstance();
        this.setupWebSocketServer();
        this.startPingInterval();
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws, request) => {
            const clientId = (0, uuid_1.v4)();
            const client = {
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
                }
                catch (error) {
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
    handleClientMessage(clientId, message) {
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
    handleSubscription(clientId, channels) {
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
    handleUnsubscription(clientId, channels) {
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
    handleClientDisconnect(clientId) {
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
    sendServerStatus(clientId) {
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
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== ws_1.WebSocket.OPEN) {
            return false;
        }
        try {
            const messageWithClientId = { ...message, clientId };
            client.ws.send(JSON.stringify(messageWithClientId));
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send message to client ${clientId}`, error);
            this.handleClientDisconnect(clientId);
            return false;
        }
    }
    broadcastToAll(type, data) {
        const message = {
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
    broadcastToChannel(channel, type, data) {
        const message = {
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
    sendConversationUpdate(sessionId, update) {
        this.broadcastToChannel(`conversation:${sessionId}`, 'conversation_update', {
            sessionId,
            ...update
        });
    }
    sendTestResults(testId, results) {
        this.broadcastToChannel(`test:${testId}`, 'test_results', {
            testId,
            results
        });
    }
    sendLLMMetrics(metrics) {
        this.broadcastToChannel('metrics:llm', 'llm_metrics', metrics);
    }
    sendPolicyAlert(alert) {
        this.broadcastToChannel('alerts:policy', 'policy_alert', alert);
    }
    // Connection management methods
    getConnectedClientCount() {
        return this.clients.size;
    }
    getClientInfo(clientId) {
        return this.clients.get(clientId);
    }
    getAllClients() {
        return Array.from(this.clients.entries()).map(([id, client]) => ({
            id,
            metadata: client.metadata,
            subscriptionCount: client.subscriptions.size
        }));
    }
    disconnectClient(clientId, reason) {
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
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.pingClients();
        }, 30000); // Ping every 30 seconds
    }
    pingClients() {
        const now = new Date();
        let deadClients = [];
        this.clients.forEach((client, clientId) => {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    client.ws.ping();
                }
                catch (error) {
                    this.logger.error(`Failed to ping client ${clientId}`, error);
                    deadClients.push(clientId);
                }
            }
            else {
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
    getHealthStatus() {
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
    close() {
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
            }
            catch (error) {
                this.logger.error(`Error closing connection for client ${clientId}`, error);
            }
        });
        // Clear clients map
        this.clients.clear();
        this.logger.info('WebSocket service shutdown complete');
    }
    // Utility methods for specific use cases
    notifyConversationStart(sessionId) {
        this.broadcastToAll('conversation_started', { sessionId });
    }
    notifyConversationEnd(sessionId, analysis) {
        this.broadcastToAll('conversation_ended', { sessionId, analysis });
    }
    notifyTestScenarioProgress(scenarioId, progress, status) {
        this.broadcastToChannel(`scenario:${scenarioId}`, 'scenario_progress', {
            scenarioId,
            progress,
            status
        });
    }
    notifySystemAlert(level, message, details) {
        this.broadcastToChannel('system:alerts', 'system_alert', {
            level,
            message,
            details,
            timestamp: new Date()
        });
    }
}
exports.WebSocketService = WebSocketService;
