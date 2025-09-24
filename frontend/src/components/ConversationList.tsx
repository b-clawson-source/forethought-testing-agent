import { useEffect } from 'react';
import { useConversationStore } from '../store/conversationStore';
import apiClient from '../lib/api';

export default function ConversationList() {
  const { conversations, selectedConversation, setConversations, setSelectedConversation } = useConversationStore();

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const response = await apiClient.getConversations();
      setConversations(response.data.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const getPersonaEmoji = (persona: string) => {
    const emojis: Record<string, string> = {
      frustrated_customer: '😤',
      neutral_customer: '🙂',
      technical_user: '👨‍💻',
      non_technical_user: '🤷',
    };
    return emojis[persona] || '💬';
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
        <button onClick={loadConversations} className="text-sm text-primary-600 hover:text-primary-700">
          🔄 Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">��</div>
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedConversation?.id === conv.id
                  ? 'bg-primary-50 border-primary-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-lg">{getPersonaEmoji(conv.persona)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  conv.status === 'active' ? 'bg-green-100 text-green-700' : 
                  conv.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {conv.status}
                </span>
              </div>
              <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-1">
                {conv.initialPrompt}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{conv.messageCount} messages</span>
                <span>{new Date(conv.startTime).toLocaleTimeString()}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
