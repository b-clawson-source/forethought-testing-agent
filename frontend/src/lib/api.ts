import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Persona {
  type: string;
  name: string;
  description: string;
  characteristics: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    actions?: string[];
    processingTime?: number;
  };
}

export interface Conversation {
  id: string;
  initialPrompt: string;
  persona: string;
  status: 'active' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  messageCount: number;
  messages: ConversationMessage[];
  turnCount?: number;
  duration?: number;
}

export const apiClient = {
  health: () => api.get('/health'),
  getPersonas: () => api.get<{ success: boolean; data: { personas: Persona[] } }>('/api/personas'),
  createConversation: (data: { initialPrompt: string; persona: string }) =>
    api.post<{ success: boolean; data: { session: Conversation } }>('/api/conversations', data),
  getConversations: () =>
    api.get<{ success: boolean; data: { conversations: Conversation[]; total: number; active: number } }>('/api/conversations'),
  getConversation: (sessionId: string) =>
    api.get<{ success: boolean; data: { session: Conversation } }>(`/api/conversations/${sessionId}`),
  continueConversation: (sessionId: string) =>
    api.post<{ success: boolean; data: { session: Conversation; newMessages: ConversationMessage[] } }>(`/api/conversations/${sessionId}/continue`),
};

export default apiClient;