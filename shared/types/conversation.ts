export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    actions?: string[];
    policyViolations?: string[];
    processingTime?: number;
  };
}

export interface ConversationSession {
  id: string;
  initialPrompt: string;
  persona: PersonaType;
  status: ConversationStatus;
  messages: ConversationMessage[];
  startTime: Date;
  endTime?: Date;
  analysis?: ConversationAnalysis;
  configuration: ConversationConfig;
}

export interface ConversationConfig {
  maxTurns: number;
  timeoutMs: number;
  llmModel: string;
  temperature: number;
  enablePolicyValidation: boolean;
  enableIntentTracking: boolean;
  enableActionValidation: boolean;
}

export interface ConversationAnalysis {
  totalMessages: number;
  averageResponseTime: number;
  intentAccuracy: number;
  policyComplianceScore: number;
  actionExecutionSuccess: number;
  conversationQuality: number;
  issues: AnalysisIssue[];
  summary: string;
}

export interface AnalysisIssue {
  type: 'policy_violation' | 'intent_miss' | 'action_failure' | 'quality_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  messageId: string;
  suggestion?: string;
}

export type ConversationStatus = 
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

export type PersonaType = 
  | 'neutral_customer'
  | 'frustrated_customer'
  | 'technical_user'
  | 'non_technical_user'
  | 'impatient_user'
  | 'detail_oriented_user'
  | 'custom';

export interface PersonaProfile {
  type: PersonaType;
  name: string;
  description: string;
  characteristics: string[];
  communicationStyle: string;
  commonPhrases: string[];
  escalationTriggers: string[];
}