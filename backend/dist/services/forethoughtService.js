"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForethoughtService = void 0;
const axios_1 = __importDefault(require("axios"));
class ForethoughtService {
    constructor() {
        this.apiKey = process.env.FORETHOUGHT_API_KEY || '';
        this.baseUrl = process.env.FORETHOUGHT_BASE_URL || 'https://api.forethought.ai';
        this.widgetId = process.env.FORETHOUGHT_WIDGET_ID;
        if (!this.apiKey) {
            console.warn('Forethought API key not configured');
        }
    }
    /**
     * Query Forethought knowledge base and get response
     */
    async queryKnowledgeBase(query) {
        try {
            // Option 1: Direct API Integration
            const response = await axios_1.default.post(`${this.baseUrl}/v1/conversations/messages`, {
                message: query.message,
                session_id: query.sessionId,
                widget_id: this.widgetId,
                context: query.context
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return this.parseForethoughtResponse(response.data);
        }
        catch (error) {
            console.error('Forethought API error:', error);
            // Fallback to widget scraping if API fails
            return this.scrapeWidgetResponse(query);
        }
    }
    /**
     * Scrape Forethought widget for response (fallback method)
     */
    async scrapeWidgetResponse(query) {
        try {
            // This would interact with your Forethought widget endpoint
            // You'll need to adjust based on your actual widget implementation
            const response = await axios_1.default.post(`${process.env.FORETHOUGHT_WIDGET_URL}/chat`, {
                message: query.message,
                sessionId: query.sessionId
            });
            return {
                response: response.data.message || 'No response from Forethought',
                intent: response.data.intent,
                confidence: response.data.confidence
            };
        }
        catch (error) {
            console.error('Widget scraping error:', error);
            return {
                response: 'Unable to get Forethought response',
                confidence: 0
            };
        }
    }
    /**
     * Parse Forethought API response into our format
     */
    parseForethoughtResponse(data) {
        return {
            response: data.response || data.message || '',
            intent: data.intent?.name,
            confidence: data.intent?.confidence,
            suggestedActions: data.suggested_actions,
            knowledgeBaseArticles: data.articles?.map((article) => ({
                title: article.title,
                url: article.url,
                relevance: article.relevance_score
            }))
        };
    }
    /**
     * Get conversation history from Forethought
     */
    async getConversationHistory(sessionId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/v1/conversations/${sessionId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data.messages || [];
        }
        catch (error) {
            console.error('Error fetching conversation history:', error);
            return [];
        }
    }
    /**
     * Check if Forethought is properly configured and accessible
     */
    async healthCheck() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/v1/health`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.status === 200;
        }
        catch (error) {
            console.error('Forethought health check failed:', error);
            return false;
        }
    }
}
exports.ForethoughtService = ForethoughtService;
