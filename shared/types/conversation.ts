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

export interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  initialPrompt: string;
  recommendedPersona: PersonaType;
  expectedIntents: string[];
  expectedActions: string[];
  tags: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  template: ConversationTemplate;
  variations: ConversationVariation[];
  expectedOutcomes: ExpectedOutcome[];
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface ConversationVariation {
  id: string;
  name: string;
  persona: PersonaType;
  promptModification?: string;
  configOverrides?: Partial<ConversationConfig>;
}

export interface ExpectedOutcome {
  type: 'intent_recognition' | 'action_execution' | 'policy_compliance' | 'conversation_resolution';
  description: string;
  criteria: OutcomeCriteria;
}

export interface OutcomeCriteria {
  minConfidence?: number;
  requiredIntents?: string[];
  requiredActions?: string[];
  maxTurns?: number;
  policyCompliance?: boolean;
  customValidation?: string;
}