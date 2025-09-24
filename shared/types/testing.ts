export interface TestConfiguration {
  numberOfConversations: number;
  personaType: string;
  maxTurnsPerConversation: number;
  delayBetweenTurns: number; // milliseconds
  delayBetweenConversations: number; // milliseconds
}

export interface ConversationTestResult {
  conversationId: string;
  startTime: Date;
  endTime: Date;
  totalTurns: number;
  success: boolean;
  errors: string[];
  metrics: {
    averageResponseTime: number;
    intentRecognitionAccuracy: number;
    resolutionAchieved: boolean;
    customerSatisfactionScore?: number;
  };
  conversationLog: ConversationTurn[];
}

export interface ConversationTurn {
  turnNumber: number;
  timestamp: Date;
  userMessage: string;
  forethoughtResponse?: string;
  llmResponse: string;
  intent?: string;
  confidence?: number;
  responseTime: number;
}

export interface TestReport {
  testId: string;
  startTime: Date;
  endTime: Date;
  configuration: TestConfiguration;
  totalConversations: number;
  successfulConversations: number;
  failedConversations: number;
  successRate: number;
  averageConversationLength: number;
  averageResponseTime: number;
  commonIntents: { intent: string; count: number }[];
  errorSummary: { error: string; count: number }[];
  conversations: ConversationTestResult[];
}

export interface ForethoughtQuery {
  message: string;
  sessionId: string;
  context?: Record<string, any>;
}

export interface ForethoughtResponse {
  response: string;
  intent?: string;
  confidence?: number;
  suggestedActions?: string[];
  knowledgeBaseArticles?: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
}