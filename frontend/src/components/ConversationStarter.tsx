import { useState, useEffect } from 'react';
import apiClient, { Persona } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';

export default function ConversationStarter() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { addConversation, setSelectedConversation, setError } = useConversationStore();

  useEffect(() => {
    apiClient.getPersonas()
      .then(res => {
        setPersonas(res.data.data.personas);
        if (res.data.data.personas.length > 0) {
          setSelectedPersona(res.data.data.personas[0].type);
        }
      })
      .catch(err => console.error('Failed to load personas:', err));
  }, []);

  const handleCreate = async () => {
    if (!initialPrompt.trim() || !selectedPersona) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.createConversation({
        initialPrompt: initialPrompt.trim(),
        persona: selectedPersona,
      });

      const conversation = response.data.data.session;
      addConversation(conversation);
      setSelectedConversation(conversation);
      
      setInitialPrompt('');
      
      console.log('✅ Conversation created:', conversation.id);
    } catch (err: any) {
      console.error('❌ Failed to create conversation:', err);
      setError(err.response?.data?.error || 'Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedPersonaData = personas.find(p => p.type === selectedPersona);

  const examplePrompts: Record<string, string> = {
    frustrated_customer: "I've been charged twice for the same service and I want an immediate refund!",
    neutral_customer: "I need help understanding my recent bill charges",
    technical_user: "I'm getting a 403 error when authenticating with your API",
    non_technical_user: "The website isn't loading and I don't know what to do"
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Start New Conversation</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Persona
          </label>
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="input"
          >
            {personas.map((persona) => (
              <option key={persona.type} value={persona.type}>
                {persona.name}
              </option>
            ))}
          </select>
          
          {selectedPersonaData && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{selectedPersonaData.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedPersonaData.characteristics.map((char) => (
                  <span key={char} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Prompt
          </label>
          <textarea
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            placeholder="Describe the customer's issue or concern..."
            rows={4}
            className="input"
          />
          
          {selectedPersona && examplePrompts[selectedPersona] && (
            <button
              type="button"
              onClick={() => setInitialPrompt(examplePrompts[selectedPersona])}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Use example prompt
            </button>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={!initialPrompt.trim() || !selectedPersona || isCreating}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating AI Conversation...
            </span>
          ) : (
            '🤖 Create AI Conversation'
          )}
        </button>
      </div>
    </div>
  );
}
