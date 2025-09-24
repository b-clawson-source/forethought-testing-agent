#!/bin/bash

echo "🎨 Creating frontend files..."

# Create lib/api.ts
mkdir -p src/lib
cat > src/lib/api.ts << 'APIEOF'
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
    api.get<{ success: boolean; data: { session: Conversation } }>(\`/api/conversations/\${sessionId}\`),
  continueConversation: (sessionId: string) =>
    api.post<{ success: boolean; data: { session: Conversation; newMessages: ConversationMessage[] } }>(\`/api/conversations/\${sessionId}/continue\`),
};

export default apiClient;
APIEOF

# Create store/conversationStore.ts
mkdir -p src/store
cat > src/store/conversationStore.ts << 'STOREEOF'
import { create } from 'zustand';
import { Conversation } from '../lib/api';

interface ConversationStore {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  
  setConversations: (conversations: Conversation[]) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  selectedConversation: null,
  isLoading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
      selectedConversation:
        state.selectedConversation?.id === id
          ? { ...state.selectedConversation, ...updates }
          : state.selectedConversation,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
STOREEOF

echo "✅ Created lib and store files"

# We'll create components in the next step
echo "📝 Run the component creation script next"
