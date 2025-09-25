import OpenAI from 'openai';
import { LLMConfig, LLMRequest, LLMResponse, LLMMessage, ConversationContext, LLMMetrics } from '../../shared/types/llm';
import { ConversationTurn } from '../../shared/types/testing';

export class LLMService {
  private static instance: LLMService;
  private openai: OpenAI;
  private metrics: LLMMetrics = {
    totalRequests: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    errorRate: 0,
    costEstimate: 0,
    requestsPerMinute: 0
  };
  private requestTimes: number[] = [];

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Core method for generating OpenAI responses
   */
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
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

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('LLM request failed:', error);
      throw error;
    }
  }

  /**
   * Generate conversation response (existing method)
   */
  public async generateConversationResponse(
    messages: LLMMessage[],
    context: ConversationContext,
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const fullConfig: LLMConfig = {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      ...config
    };

    // Add system message based on persona and context
    const systemMessage = this.buildSystemMessage(context);
    const fullMessages = [systemMessage, ...messages];

    const request: LLMRequest = {
      messages: fullMessages,
      config: fullConfig,
      context
    };

    return this.generateResponse(request);
  }

  /**
   * TEST METHOD: Generate response for autonomous testing
   */
  public async generateTestResponse(
    userMessage: string,
    forethoughtResponse: string,
    personaType: string,
    conversationHistory: ConversationTurn[]
  ): Promise<{ message: string; shouldEndConversation: boolean }> {
    const systemPrompt = this.buildTestSystemPrompt(personaType, conversationHistory);
    
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.convertHistoryToMessages(conversationHistory.slice(-3)), // Last 3 turns for context
      { role: 'assistant', content: forethoughtResponse },
      { 
        role: 'user', 
        content: `As the ${personaType} customer, respond naturally to the support agent's message above. 
        If your issue has been resolved or you're satisfied, express that naturally (e.g., "thank you", "that helps", "perfect").
        Otherwise, continue the conversation with follow-up questions or clarifications.
        Stay in character and be realistic.`
      }
    ];

    const response = await this.generateResponse({
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
   * TEST METHOD: Generate next user message
   */
  public async generateNextUserMessage(
    personaType: string,
    conversationHistory: ConversationTurn[]
  ): Promise<string> {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    
    const systemPrompt = `You are a ${personaType} customer continuing a support conversation.
    Based on the agent's last response, generate your next message.
    Stay in character and be realistic.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.convertHistoryToMessages(conversationHistory.slice(-2)), // Last 2 turns
      { 
        role: 'user', 
        content: `The support agent said: "${lastTurn.forethoughtResponse}". What is your natural response?`
      }
    ];

    const response = await this.generateResponse({
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
   * TEST METHOD: Generate initial prompt
   */
  public async generateInitialPrompt(
    personaType: string,
    previousContext?: string
  ): Promise<string> {
    const personas: Record<string, string> = {
      'frustrated_customer': 'You are a frustrated customer experiencing repeated technical issues with the service.',
      'confused_elderly': 'You are an elderly person who is not tech-savvy and needs patient explanations.',
      'angry_billing': 'You are upset about unexpected charges on your account.',
      'new_user': 'You are a new user trying to understand how the service works.',
      'technical_expert': 'You are technically proficient and need advanced troubleshooting help.',
      'happy_customer': 'You are generally satisfied but have a specific question.'
    };

    const personaPrompt = personas[personaType] || personas['new_user'];

    const systemPrompt = `${personaPrompt}
    Generate a realistic initial customer support message.
    ${previousContext ? `Build upon this context: ${previousContext}` : 'Start a new topic.'}
    The message should be 1-3 sentences expressing a specific problem or question.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate my initial support request:' }
    ];

    const response = await this.generateResponse({
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
  private buildTestSystemPrompt(personaType: string, history: ConversationTurn[]): string {
    const turnCount = history.length;
    
    const personaBehaviors: Record<string, string> = {
      'frustrated_customer': 'Show impatience, demand quick solutions, express dissatisfaction when appropriate',
      'confused_elderly': 'Ask for clarification, may misunderstand terms, need patient help, be polite but confused',
      'angry_billing': 'Focus on billing issues, demand explanations, express frustration about charges',
      'new_user': 'Ask basic questions, show curiosity, may not understand terminology',
      'technical_expert': 'Use technical language, expect detailed answers, may challenge incorrect info',
      'happy_customer': 'Be polite, express gratitude, have reasonable expectations'
    };

    const behavior = personaBehaviors[personaType] || personaBehaviors['new_user'];
    
    return `You are simulating a ${personaType.replace('_', ' ')} interacting with customer support.
    
Current turn: ${turnCount + 1}
Behavioral guidelines: ${behavior}
    
Important:
- Stay completely in character
- React naturally to the support responses
- Express satisfaction when issues are resolved
- Don't mention testing or break character
- Use natural language appropriate to your persona`;
  }

  /**
   * Original buildSystemMessage for existing conversation engine
   */
  private buildSystemMessage(context: ConversationContext): LLMMessage {
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

  /**
   * Convert conversation history to LLM messages
   */
  private convertHistoryToMessages(history: ConversationTurn[]): LLMMessage[] {
    const messages: LLMMessage[] = [];
    
    history.forEach(turn => {
      if (turn.userMessage) {
        messages.push({ role: 'user', content: turn.userMessage });
      }
      if (turn.forethoughtResponse) {
        messages.push({ role: 'assistant', content: turn.forethoughtResponse });
      }
    });

    return messages;
  }

  /**
   * Check if conversation should end
   */
  private checkForConversationEnd(message: string): boolean {
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
      'all set',
      'perfect'
    ];

    const lowerMessage = message.toLowerCase();
    return endPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Convert to OpenAI format
   */
  private convertToOpenAIFormat(messages: LLMMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map(message => ({
      role: message.role as 'system' | 'user' | 'assistant',
      content: message.content,
      ...(message.name && { name: message.name })
    }));
  }

  /**
   * Format OpenAI response
   */
  private formatResponse(completion: OpenAI.Chat.Completions.ChatCompletion, processingTime: number): LLMResponse {
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
      finishReason: choice.finish_reason as 'stop' | 'length' | 'function_call' | 'content_filter',
      processingTime
    };
  }

  /**
   * Update usage metrics
   */
  private updateMetrics(response: LLMResponse): void {
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
    const requestCost = 
      (response.usage.promptTokens / 1000 * inputCostPer1k) +
      (response.usage.completionTokens / 1000 * outputCostPer1k);
    this.metrics.costEstimate += requestCost;
  }

  public getMetrics(): LLMMetrics {
    return { ...this.metrics };
  }

  public async validateApiKey(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI API key validation failed:', error);
      return false;
    }
  }

  public async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return ['gpt-4-turbo-preview', 'gpt-3.5-turbo'];
    }
  }
}