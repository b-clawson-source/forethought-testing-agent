export interface ConversationTurn {
  speaker: 'customer' | 'agent';
  message: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    responseTime?: number;
    knowledgeBaseArticles?: KnowledgeBaseArticle[];
    suggestedActions?: string[];
  };
}

export interface KnowledgeBaseArticle {
  title: string;
  url: string;
  relevance: number;
}

export interface ConversationMetrics {
  intentAccuracy: number;
  resolutionRate: number;
  customerSatisfactionScore: number;
  averageConfidence: number;
}

export interface ConversationLog {
  id: string;
  startTime: Date;
  endTime: Date;
  turns: ConversationTurn[];
  resolved: boolean;
  persona: CustomerPersona['type'];
  scenario: string;
  metrics: {
    totalTurns: number;
    averageResponseTime: number;
    intentAccuracy: number;
    customerSatisfaction: number;
  };
}

export interface TestReport {
  id: string;
  startTime: Date;
  endTime: Date;
  totalConversations: number;
  successfulConversations: number;
  failedConversations: number;
  averageResponseTime: number;
  averageTurns: number;
  conversationLogs: ConversationLog[];
  metrics: ConversationMetrics;
}

export interface CustomerPersona {
  type: 'frustrated' | 'confused' | 'technical' | 'polite' | 'impatient';
  description: string;
  responseStyle: string;
}

export interface ConversationConfig {
  maxTurns: number;
  conversationCount: number;
  customerPersonas: CustomerPersona[];
}

export interface ForethoughtResponse {
  response?: string;
  message?: string;
  intent?: string;
  confidence?: number;
  suggestedActions?: string[];
  knowledgeBaseArticles?: KnowledgeBaseArticle[];
  sessionId?: string;
}

export interface AutoTestRequest {
  initialPrompt: string;
  conversationCount?: number;
  maxTurns?: number;
  personas?: CustomerPersona[];
}

export interface AutoTestResponse {
  testId: string;
  status: 'running' | 'completed' | 'failed';
  report?: TestReport;
  progress?: {
    completed: number;
    total: number;
    currentConversation?: string;
  };
}