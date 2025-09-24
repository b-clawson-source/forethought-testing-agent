import { useEffect } from 'react';
import Header from './components/Header';
import ConversationStarter from './components/ConversationStarter';
import ConversationList from './components/ConversationList';
import ConversationViewer from './components/ConversationViewer';
import { useConversationStore } from './store/conversationStore';

function App() {
  const { error, clearError } = useConversationStore();

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(clearError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 mr-3">⚠️</span>
              <span className="text-sm text-red-800">{error}</span>
            </div>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Conversation Starter */}
          <div className="lg:col-span-1">
            <ConversationStarter />
            <div className="mt-6">
              <ConversationList />
            </div>
          </div>

          {/* Right Column - Conversation Viewer */}
          <div className="lg:col-span-2">
            <ConversationViewer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
