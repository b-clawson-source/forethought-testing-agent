import { LLMConfig, LLMRequest, LLMResponse, LLMMessage, ConversationContext, LLMMetrics } from '../../shared/types/llm';
import { ConversationTurn } from '../../shared/types/testing';
export declare class LLMService {
    private static instance;
    private openai;
    private metrics;
    private requestTimes;
    private constructor();
    static getInstance(): LLMService;
    /**
     * Core method for generating OpenAI responses
     */
    generateResponse(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Generate conversation response (existing method)
     */
    generateConversationResponse(messages: LLMMessage[], context: ConversationContext, config?: Partial<LLMConfig>): Promise<LLMResponse>;
    /**
     * TEST METHOD: Generate response for autonomous testing
     */
    generateTestResponse(userMessage: string, forethoughtResponse: string, personaType: string, conversationHistory: ConversationTurn[]): Promise<{
        message: string;
        shouldEndConversation: boolean;
    }>;
    /**
     * TEST METHOD: Generate next user message
     */
    generateNextUserMessage(personaType: string, conversationHistory: ConversationTurn[]): Promise<string>;
    /**
     * TEST METHOD: Generate initial prompt
     */
    generateInitialPrompt(personaType: string, previousContext?: string): Promise<string>;
    /**
     * Build system prompt for testing
     */
    private buildTestSystemPrompt;
    /**
     * Original buildSystemMessage for existing conversation engine
     */
    private buildSystemMessage;
    /**
     * Convert conversation history to LLM messages
     */
    private convertHistoryToMessages;
    /**
     * Check if conversation should end
     */
    private checkForConversationEnd;
    /**
     * Convert to OpenAI format
     */
    private convertToOpenAIFormat;
    /**
     * Format OpenAI response
     */
    private formatResponse;
    /**
     * Update usage metrics
     */
    private updateMetrics;
    getMetrics(): LLMMetrics;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
}
//# sourceMappingURL=llmService.d.ts.map