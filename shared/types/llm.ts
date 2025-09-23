export interface LLMRequest {
  messages: LLMMessage[];
  config: LLMConfig;
  context?: ConversationContext;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface LLMConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMResponse {
  message: LLMMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  processingTime: number;
}

export interface ConversationContext {
  sessionId: string;
  persona: string;
  currentTurn: number;
  lastForethoughtResponse?: string;
  lastIntent?: string;
  lastActions?: string[];
  policyContext?: string;
  conversationGoal?: string;
}

export interface LLMMetrics {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  errorRate: number;
  costEstimate: number;
  requestsPerMinute: number;
}
