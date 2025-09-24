"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
class LLMService {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            averageResponseTime: 0,
            errorRate: 0,
            costEstimate: 0,
            requestsPerMinute: 0
        };
        this.requestTimes = [];
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    static getInstance() {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }
    async generateResponse(request) {
        const startTime = Date.now();
        try {
            const openAIMessages = this.convertToOpenAIFormat(request.messages);
            const completion = await this.openai.chat.completions.create({
                model: request.config.model,
                messages: openAIMessages,
                temperature: request.config.temperature,
                max_tokens: request.config.maxTokens,
                top_p: request.config.topP,
                frequency_penalty: request.config.frequencyPenalty,
                presence_penalty: request.config.presencePenalty
            });
            const processingTime = Date.now() - startTime;
            const response = this.formatResponse(completion, processingTime);
            // Update metrics
            this.updateMetrics(response);
            console.log(`LLM request completed: ${response.usage.totalTokens} tokens in ${processingTime}ms`);
            return response;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('LLM request failed:', error);
            throw error;
        }
    }
    async generateConversationResponse(messages, context, config) {
        const fullConfig = {
            provider: 'openai',
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
            ...config
        };
        // Add system message based on persona and context
        const systemMessage = this.buildSystemMessage(context);
        const fullMessages = [systemMessage, ...messages];
        const request = {
            messages: fullMessages,
            config: fullConfig,
            context
        };
        return this.generateResponse(request);
    }
    buildSystemMessage(context) {
        let systemPrompt = `You are simulating a customer interacting with a support chatbot for testing purposes.

Persona: ${context.persona}
Current turn: ${context.currentTurn}
Conversation goal: ${context.conversationGoal || 'Get help with a support issue'}

Guidelines:
1. Stay in character as the specified persona
2. Respond naturally to the chatbot's messages
3. Ask follow-up questions when appropriate
4. Show realistic customer behavior (frustration, confusion, satisfaction)
5. Don't break character or mention that you're testing`;
        if (context.lastForethoughtResponse) {
            systemPrompt += `\n\nThe support chatbot just said: "${context.lastForethoughtResponse}"`;
        }
        return {
            role: 'system',
            content: systemPrompt
        };
    }
    convertToOpenAIFormat(messages) {
        return messages.map(message => ({
            role: message.role,
            content: message.content,
            ...(message.name && { name: message.name })
        }));
    }
    formatResponse(completion, processingTime) {
        const choice = completion.choices[0];
        if (!choice || !choice.message) {
            throw new Error('Invalid response from OpenAI');
        }
        return {
            message: {
                role: choice.message.role,
                content: choice.message.content || ''
            },
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0
            },
            finishReason: choice.finish_reason,
            processingTime
        };
    }
    updateMetrics(response) {
        this.metrics.totalRequests++;
        this.metrics.totalTokens += response.usage.totalTokens;
        // Update average response time
        this.requestTimes.push(response.processingTime);
        if (this.requestTimes.length > 100) {
            this.requestTimes.shift(); // Keep only last 100 requests
        }
        this.metrics.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
        // Estimate cost (rough calculation for GPT-4)
        const inputCostPer1k = 0.03;
        const outputCostPer1k = 0.06;
        const requestCost = (response.usage.promptTokens / 1000 * inputCostPer1k) +
            (response.usage.completionTokens / 1000 * outputCostPer1k);
        this.metrics.costEstimate += requestCost;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async validateApiKey() {
        try {
            await this.openai.models.list();
            return true;
        }
        catch (error) {
            console.error('OpenAI API key validation failed:', error);
            return false;
        }
    }
    async getAvailableModels() {
        try {
            const models = await this.openai.models.list();
            return models.data
                .filter(model => model.id.includes('gpt'))
                .map(model => model.id)
                .sort();
        }
        catch (error) {
            console.error('Failed to fetch available models:', error);
            return ['gpt-4-turbo-preview', 'gpt-3.5-turbo'];
        }
    }
}
exports.LLMService = LLMService;
