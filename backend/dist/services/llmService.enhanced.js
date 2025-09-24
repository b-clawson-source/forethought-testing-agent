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
    // ... [Keep all existing methods from your current llmService.ts] ...
    /**
     * Generate response for autonomous testing
     */
    async generateResponse(userMessage, forethoughtResponse, personaType, conversationHistory) {
        const systemPrompt = this.buildTestSystemPrompt(personaType, conversationHistory);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.convertHistoryToMessages(conversationHistory),
            { role: 'assistant', content: forethoughtResponse },
            { role: 'user', content: 'Based on the support response above, continue the conversation naturally as the customer. If your issue has been resolved or you want to end the conversation, include phrases like "thank you", "that helps", or "goodbye". Otherwise, continue asking questions or expressing your needs.' }
        ];
        const response = await this.generateResponseInternal({
            messages,
            config: {
                provider: 'openai',
                model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                temperature: 0.8,
                maxTokens: 300
            }
        });
        const shouldEnd = this.checkForConversationEnd(response.message.content);
        return {
            message: response.message.content,
            shouldEndConversation: shouldEnd
        };
    }
    /**
     * Generate next user message for testing
     */
    async generateNextUserMessage(personaType, conversationHistory) {
        const lastTurn = conversationHistory[conversationHistory.length - 1];
        const systemPrompt = `You are simulating a ${personaType} customer for testing purposes.
    Continue the conversation based on the support agent's last response.
    Stay in character and respond naturally.`;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.convertHistoryToMessages(conversationHistory.slice(-3)), // Last 3 turns for context
            {
                role: 'user',
                content: `The support agent said: "${lastTurn.forethoughtResponse}". What is your natural response as a ${personaType} customer?`
            }
        ];
        const response = await this.generateResponseInternal({
            messages,
            config: {
                provider: 'openai',
                model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                temperature: 0.8,
                maxTokens: 200
            }
        });
        return response.message.content;
    }
    /**
     * Generate initial prompt based on persona and context
     */
    async generateInitialPrompt(personaType, previousContext) {
        const personas = {
            'frustrated_customer': 'You are a frustrated customer who has been experiencing repeated technical issues.',
            'confused_elderly': 'You are an elderly person who is not very tech-savvy and needs patient, clear explanations.',
            'angry_billing': 'You are upset about unexpected charges on your account.',
            'new_user': 'You are a new user trying to understand how the service works.',
            'technical_expert': 'You are technically proficient and need advanced troubleshooting.',
            'happy_customer': 'You are generally satisfied but have a specific question or minor issue.'
        };
        const personaPrompt = personas[personaType] || personas['new_user'];
        const systemPrompt = `${personaPrompt}
    Generate a realistic initial customer support message.
    ${previousContext ? `Previous conversation context: ${previousContext}` : ''}
    The message should be 1-3 sentences and express a specific problem or question.`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate my initial support request:' }
        ];
        const response = await this.generateResponseInternal({
            messages,
            config: {
                provider: 'openai',
                model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                temperature: 0.9,
                maxTokens: 150
            }
        });
        return response.message.content;
    }
    /**
     * Build system prompt for testing
     */
    buildTestSystemPrompt(personaType, history) {
        const turnCount = history.length;
        return `You are simulating a ${personaType} customer interacting with a support chatbot.
    
Current conversation turn: ${turnCount + 1}
    
Behavioral guidelines based on persona:
- frustrated_customer: Show impatience, demand quick solutions, may express dissatisfaction
- confused_elderly: Ask for clarification, may misunderstand technical terms, needs patient help
- angry_billing: Focus on billing issues, demand refunds or explanations, express frustration about money
- new_user: Ask basic questions, show curiosity, may not understand terminology
- technical_expert: Use technical language, expect detailed answers, may challenge incorrect information
- happy_customer: Be polite, express gratitude, have reasonable expectations

Stay in character throughout the conversation.
Respond naturally to the support agent's messages.
If your issue gets resolved, express satisfaction.
Don't mention you're testing or break character.`;
    }
    /**
     * Convert conversation history to LLM messages
     */
    convertHistoryToMessages(history) {
        const messages = [];
        history.forEach(turn => {
            messages.push({ role: 'user', content: turn.userMessage });
            if (turn.forethoughtResponse) {
                messages.push({ role: 'assistant', content: turn.forethoughtResponse });
            }
        });
        return messages;
    }
    /**
     * Check if conversation should end
     */
    checkForConversationEnd(message) {
        const endPhrases = [
            'thank you',
            'thanks',
            'that helps',
            'problem solved',
            'issue resolved',
            'goodbye',
            'bye',
            'have a nice day',
            'appreciate your help',
            "that's all",
            'no more questions',
            'all set'
        ];
        const lowerMessage = message.toLowerCase();
        return endPhrases.some(phrase => lowerMessage.includes(phrase));
    }
    /**
     * Internal method that matches the existing generateResponse signature
     */
    async generateResponseInternal(request) {
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
            this.updateMetrics(response);
            console.log(`LLM request completed: ${response.usage.totalTokens} tokens in ${processingTime}ms`);
            return response;
        }
        catch (error) {
            console.error('LLM request failed:', error);
            throw error;
        }
    }
    // ... [Include all other existing methods from your current llmService.ts] ...
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
        this.requestTimes.push(response.processingTime);
        if (this.requestTimes.length > 100) {
            this.requestTimes.shift();
        }
        this.metrics.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
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
}
exports.LLMService = LLMService;
