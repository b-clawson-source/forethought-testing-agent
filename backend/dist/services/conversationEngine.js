"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationEngine = void 0;
const uuid_1 = require("uuid");
const llmService_1 = require("./llmService");
const databaseService_1 = require("./databaseService");
const forethoughtService_1 = require("./forethoughtService");
class ConversationEngine {
    constructor() {
        this.llmService = llmService_1.LLMService.getInstance();
        this.forethoughtService = forethoughtService_1.ForethoughtService.getInstance();
        this.activeSessions = new Map();
    }
    static getInstance() {
        if (!ConversationEngine.instance) {
            ConversationEngine.instance = new ConversationEngine();
        }
        return ConversationEngine.instance;
    }
    async startConversation(initialPrompt, persona, config) {
        const sessionId = (0, uuid_1.v4)();
        const fullConfig = {
            maxTurns: parseInt(process.env.MAX_CONVERSATION_TURNS ?? '6', 10),
            timeoutMs: parseInt(process.env.CONVERSATION_TIMEOUT_MS ?? '300000', 10),
            llmModel: process.env.OPENAI_MODEL ?? 'gpt-4-turbo-preview',
            temperature: Number(process.env.OPENAI_TEMPERATURE ?? '0.7'),
            enablePolicyValidation: true,
            enableIntentTracking: true,
            enableActionValidation: true,
            ...config
        };
        const session = {
            id: sessionId,
            initialPrompt,
            persona,
            // If enum:
            // status: ConversationStatus.Pending,
            status: 'pending',
            messages: [],
            startTime: new Date(),
            configuration: fullConfig
        };
        await this.saveSession(session);
        this.activeSessions.set(sessionId, session);
        console.log(`Started conversation ${sessionId} with persona: ${persona}`);
        const t = setTimeout(() => this.generateInitialUserMessage(session), 500);
        if ('unref' in t && typeof t.unref === 'function')
            t.unref();
        return session;
    }
    async generateInitialUserMessage(session) {
        const context = {
            sessionId: session.id,
            persona: session.persona,
            currentTurn: 0,
            conversationGoal: session.initialPrompt
        };
        try {
            const llmResponse = await this.llmService.generateConversationResponse([], context, {
                temperature: session.configuration.temperature,
                model: session.configuration.llmModel
            });
            const userMessage = {
                id: (0, uuid_1.v4)(),
                role: 'user',
                content: llmResponse.message.content,
                timestamp: new Date(),
                metadata: { processingTime: llmResponse.processingTime }
            };
            session.messages.push(userMessage);
            // If enum:
            // session.status = ConversationStatus.Active;
            session.status = 'active';
            await this.saveMessage(session.id, userMessage);
            await this.updateSessionStatus(session.id, session.status);
            console.log(`Generated initial message for ${session.id}: ${userMessage.content.substring(0, 50)}...`);
            const t = setTimeout(() => this.processNextTurn(session.id), 1000);
            if ('unref' in t && typeof t.unref === 'function')
                t.unref();
        }
        catch (error) {
            console.error('Failed to generate initial user message:', error);
            // If enum:
            // session.status = ConversationStatus.Failed;
            session.status = 'failed';
            await this.updateSessionStatus(session.id, session.status);
        }
    }
    async processNextTurn(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.status !== 'active')
            return;
        try {
            const lastMessage = session.messages[session.messages.length - 1];
            if (lastMessage.role === 'user') {
                const forethoughtResponse = await this.forethoughtService.processMessage(lastMessage.content, sessionId);
                const assistantMessage = {
                    id: (0, uuid_1.v4)(),
                    role: 'assistant',
                    content: forethoughtResponse.response,
                    timestamp: new Date(),
                    metadata: {
                        intent: forethoughtResponse.intent,
                        confidence: forethoughtResponse.confidence,
                        actions: forethoughtResponse.actions,
                        processingTime: forethoughtResponse.processingTime
                    }
                };
                session.messages.push(assistantMessage);
                await this.saveMessage(sessionId, assistantMessage);
                console.log(`Assistant response for ${sessionId}: ${forethoughtResponse.intent} (${forethoughtResponse.confidence})`);
                if (session.messages.length < session.configuration.maxTurns) {
                    const t = setTimeout(() => this.generateNextUserMessage(session), 2000);
                    if ('unref' in t && typeof t.unref === 'function')
                        t.unref();
                }
                else {
                    await this.endConversation(sessionId);
                }
            }
        }
        catch (error) {
            console.error(`Error processing turn for ${sessionId}:`, error);
            await this.endConversation(sessionId);
        }
    }
    // ... (rest unchanged except applying the same patterns for catch: unknown, timers, and enum-safe statuses)
    async getAllSessions(limit = 20) {
        try {
            const db = await databaseService_1.DatabaseService.getInstance().getDatabase();
            // Prefer start_time if created_at isn't guaranteed:
            const sessionRows = await db.all(`
        SELECT * FROM conversation_sessions 
        ORDER BY start_time DESC 
        LIMIT ?
        `, [limit]);
            return sessionRows.map((row) => ({
                id: row.id,
                initialPrompt: row.initial_prompt,
                persona: row.persona,
                status: row.status,
                messages: [],
                startTime: new Date(row.start_time),
                endTime: row.end_time ? new Date(row.end_time) : undefined,
                configuration: JSON.parse(row.configuration),
                analysis: row.analysis ? JSON.parse(row.analysis) : undefined
            }));
        }
        catch (error) {
            console.error('Failed to get all sessions:', error);
            return [];
        }
    }
}
exports.ConversationEngine = ConversationEngine;
