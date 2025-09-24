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
