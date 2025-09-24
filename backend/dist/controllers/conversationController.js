"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationController = void 0;
const conversationEngine_1 = require("../services/conversationEngine");
const conversationEngine = conversationEngine_1.ConversationEngine.getInstance();
class ConversationController {
    static async startConversation(req, res) {
        try {
            const { initialPrompt, persona, configuration } = req.body;
            if (!initialPrompt || !persona) {
                res.status(400).json({
                    success: false,
                    error: 'initialPrompt and persona are required'
                });
                return;
            }
            console.log(`Starting conversation: ${persona} - ${initialPrompt.substring(0, 50)}...`);
            const session = await conversationEngine.startConversation(initialPrompt, persona, configuration);
            res.status(201).json({
                success: true,
                data: {
                    session: {
                        id: session.id,
                        initialPrompt: session.initialPrompt,
                        persona: session.persona,
                        status: session.status,
                        startTime: session.startTime,
                        configuration: session.configuration,
                        messageCount: session.messages.length
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to start conversation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getConversation(req, res) {
        try {
            const { sessionId } = req.params;
            const session = await conversationEngine.getSession(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    session: {
                        ...session,
                        messageCount: session.messages.length,
                        duration: session.endTime
                            ? session.endTime.getTime() - session.startTime.getTime()
                            : Date.now() - session.startTime.getTime()
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to get conversation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getAllConversations(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const sessions = await conversationEngine.getAllSessions(limit);
            const sessionsWithSummary = sessions.map(session => ({
                id: session.id,
                initialPrompt: session.initialPrompt.substring(0, 100) + (session.initialPrompt.length > 100 ? '...' : ''),
                persona: session.persona,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
                messageCount: session.messages.length,
                duration: session.endTime
                    ? session.endTime.getTime() - session.startTime.getTime()
                    : Date.now() - session.startTime.getTime(),
                analysisScore: session.analysis?.conversationQuality || null
            }));
            res.json({
                success: true,
                data: {
                    sessions: sessionsWithSummary,
                    total: sessions.length
                }
            });
        }
        catch (error) {
            console.error('Failed to get conversations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getConversationMessages(req, res) {
        try {
            const { sessionId } = req.params;
            const session = await conversationEngine.getSession(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    messages: session.messages,
                    total: session.messages.length
                }
            });
        }
        catch (error) {
            console.error('Failed to get messages:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getStats(req, res) {
        try {
            const sessions = await conversationEngine.getAllSessions(100);
            const activeSessionIds = conversationEngine.getActiveSessionIds();
            const stats = {
                active: activeSessionIds.length,
                total: sessions.length,
                completed: sessions.filter(s => s.status === 'completed').length,
                failed: sessions.filter(s => s.status === 'failed').length,
                averageMessages: sessions.length > 0
                    ? sessions.reduce((sum, s) => sum + s.messages.length, 0) / sessions.length
                    : 0,
                byPersona: {}
            };
            // Count by persona
            sessions.forEach(session => {
                stats.byPersona[session.persona] = (stats.byPersona[session.persona] || 0) + 1;
            });
            res.json({
                success: true,
                data: { stats }
            });
        }
        catch (error) {
            console.error('Failed to get stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.ConversationController = ConversationController;
