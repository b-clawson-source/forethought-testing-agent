export interface ForethoughtResponse {
  response?: string;
  message?: string;
  intent?: string;
  confidence?: number;
  suggestedActions?: string[];
  knowledgeBaseArticles?: KnowledgeBaseArticle[];
  sessionId?: string;
}

export interface KnowledgeBaseArticle {
  title: string;
  url: string;
  relevance: number;
}

export interface ConversationTurn {
  speaker: 'customer' | 'agent';
  message: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    responseTime?: number;
  };
}