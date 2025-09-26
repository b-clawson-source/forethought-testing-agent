import React, { useState } from 'react';

const ConversationTester = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('test-session');

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/conversations/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMessages = [
    "Where are my points?",
    "I'm missing points from my receipt", 
    "How long will this take to resolve?",
    "My receipt was rejected",
    "I need help with my account"
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Conversation Tester</h1>
      
      {/* Quick test buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Quick Tests:</h3>
        <div className="flex flex-wrap gap-2">
          {testMessages.map((msg, index) => (
            <button
              key={index}
              onClick={() => setMessage(msg)}
              className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* Manual input */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Session ID"
            className="px-3 py-2 border border-gray-300 rounded flex-1"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="px-3 py-2 border border-gray-300 rounded flex-1"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Response:</h3>
          {response.success ? (
            <div>
              <div className="bg-green-100 p-3 rounded mb-3">
                <p className="text-green-800 font-medium">Agent Response:</p>
                <p className="text-green-700">{response.response}</p>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Intent:</strong> {response.intent}</p>
                <p><strong>Confidence:</strong> {response.confidence}%</p>
                <p><strong>Session:</strong> {response.sessionId}</p>
                {response.suggestedActions && (
                  <p><strong>Actions:</strong> {response.suggestedActions.join(', ')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-100 p-3 rounded">
              <p className="text-red-800">Error: {response.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationTester;
