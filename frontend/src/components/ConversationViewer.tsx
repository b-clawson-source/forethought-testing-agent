import { useEffect, useState } from 'react';
import { useConversationStore } from '../store/conversationStore';
import apiClient, { ConversationMessage } from '../lib/api';

export default function ConversationViewer() {
  const { selectedConversation, updateConversation } = useConversationStore();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(selectedConversation.messages || []);
    }
  }, [selectedConversation]);

  const handleContinue = async () => {
    if (!selectedConversation || selectedConversation.status !== 'active') return;

    setIsContinuing(true);
    try {
      const response = await apiClient.continueConversation(selectedConversation.id);
      const updatedConversation = response.data.data.session;
      
      updateConversation(selectedConversation.id, updatedConversation);
      setMessages(updatedConversation.messages);
      
      console.log('✅ Conversation continued:', updatedConversation.turnCount);
    } catch (err) {
      console.error('❌ Failed to continue conversation:', err);
    } finally {
      setIsContinuing(false);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="card flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversation Selected</h3>
          <p className="text-gray-500">Create a new conversation or select one from the list</p>
        </div>
      </div>
    );
  }

  const getPersonaColor = (persona: string) => {
    const colors: Record<string, string> = {
      frustrated_customer: 'bg-red-100 text-red-800 border-red-200',
      neutral_customer: 'bg-blue-100 text-blue-800 border-blue-200',
      technical_user: 'bg-purple-100 text-purple-800 border-purple-200',
      non_technical_user: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[persona] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPersonaEmoji = (persona: string) => {
    const emojis: Record<string, string> = {
      frustrated_customer: '😤',
      neutral_customer: '��',
      technical_user: '👨‍💻',
      non_technical_user: '🤷',
    };
    return emojis[persona] || '💬';
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{getPersonaEmoji(selectedConversation.persona)}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPersonaColor(selectedConversation.persona)}`}>
              {selectedConversation.persona.replace('_', ' ')}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedConversation.status === 'active' ? 'bg-green-100 text-green-800' : 
              selectedConversation.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {selectedConversation.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 italic">"{selectedConversation.initialPrompt}"</p>
        </div>
        
        {selectedConversation.status === 'active' && (
          <button
            onClick={handleContinue}
            disabled={isContinuing}
            className="btn-primary ml-4 disabled:opacity-50"
          >
            {isContinuing ? '⏳ Continuing...' : '▶️ Continue'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold opacity-75">
                    {message.role === 'user' ? 'Customer' : 'Support Agent'}
                  </span>
                  <span className="text-xs opacity-75 ml-4">
                    Turn {Math.floor(index / 2) + 1}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.metadata && message.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-gray-200 border-opacity-20">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {message.metadata.intent && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-white bg-opacity-20">
                          🎯 {message.metadata.intent}
                        </span>
                      )}
                      {message.metadata.confidence && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-white bg-opacity-20">
                          📊 {Math.round(message.metadata.confidence * 100)}%
                        </span>
                      )}
                      {message.metadata.actions && message.metadata.actions.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-white bg-opacity-20">
                          ⚡ {message.metadata.actions.length} actions
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600">{messages.length}</div>
            <div className="text-xs text-gray-500">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">{selectedConversation.turnCount || Math.floor(messages.length / 2)}</div>
            <div className="text-xs text-gray-500">Turns</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {selectedConversation.duration ? `${Math.round(selectedConversation.duration / 1000)}s` : '-'}
            </div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
        </div>
      </div>
    </div>
  );
}
