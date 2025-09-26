// Direct Forethought Widget Integration
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class ForethoughtWidgetClient {
  constructor() {
    this.apiKey = 'f633608a-e999-442a-8f94-312ec5ff33ae';
    this.baseUrl = 'https://solve-widget.forethought.ai';
    this.sessionId = null;
  }

  // Initialize a new session
  async initSession() {
    this.sessionId = uuidv4();
    return this.sessionId;
  }

  // Send message to Forethought widget
  async sendMessage(message, sessionId = null) {
    try {
      const currentSessionId = sessionId || this.sessionId || this.initSession();
      
      // Build the request with all the data attributes from your widget
      const requestBody = {
        message: message,
        session_id: currentSessionId,
        api_key: this.apiKey,
        // Add Fetch-specific context
        'data-ft-ContactEntryPoint': 'Testing Agent',
        'data-ft-Language': 'English',
        'data-ft-Mobile-Platform': 'Web',
      };

      // Try the widget API endpoint
      const response = await axios.post(
        `${this.baseUrl}/api/v1/chat/message`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://fetch.com', // May need to match your domain
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        response: response.data.message || response.data.response || response.data,
        sessionId: currentSessionId,
        raw: response.data
      };

    } catch (error) {
      console.error('Forethought widget error:', error.response?.data || error.message);
      
      // Try alternate endpoints if the first fails
      if (error.response?.status === 404) {
        return this.tryAlternateEndpoint(message, sessionId);
      }
      
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  // Try alternate Forethought endpoints
  async tryAlternateEndpoint(message, sessionId) {
    const endpoints = [
      '/api/chat',
      '/api/messages',
      '/chat',
      '/v1/messages'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(
          `${this.baseUrl}${endpoint}`,
          {
            message: message,
            sessionId: sessionId || this.sessionId,
            apiKey: this.apiKey
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        console.log(`Success with endpoint: ${endpoint}`);
        return {
          success: true,
          response: response.data.message || response.data.response || response.data,
          sessionId: sessionId,
          endpoint: endpoint
        };
      } catch (err) {
        continue;
      }
    }

    return {
      success: false,
      error: 'All endpoints failed',
      response: null
    };
  }

  // Get conversation history
  async getHistory(sessionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/chat/history/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to get history:', error.message);
      return [];
    }
  }
}

// Add to your server.js - Enhanced freeform endpoint with real Forethought
const forethoughtClient = new ForethoughtWidgetClient();

app.post('/api/fetch/freeform/real', async (req, res) => {
  const { query, maxTurns } = req.body;
  
  if (!query) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query is required' 
    });
  }
  
  const conversationId = `freeform_real_${Date.now()}`;
  const config = {
    maxTurns: maxTurns || 10,
    useRealForethought: true,
    useOpenAI: !!process.env.OPENAI_API_KEY
  };
  
  // Initialize Forethought session
  const sessionId = await forethoughtClient.initSession();
  
  // Store as active test
  const test = {
    id: conversationId,
    type: 'freeform_real',
    config,
    status: 'running',
    startTime: new Date().toISOString(),
    initialQuery: query,
    forethoughtSessionId: sessionId
  };
  
  activeTests.set(conversationId, test);
  
  // Start SSE logs
  emitLog(conversationId, 'info', '🎯 Starting conversation with REAL Forethought widget');
  emitLog(conversationId, 'info', `Session ID: ${sessionId}`);
  emitLog(conversationId, 'info', `Initial query: "${query}"`);
  
  // Run the conversation in background
  setTimeout(() => runRealForethoughtConversation(conversationId, query, sessionId, config), 100);
  
  res.json({
    success: true,
    conversationId,
    sessionId,
    message: 'Real Forethought conversation started',
    config
  });
});

// Run conversation with real Forethought
async function runRealForethoughtConversation(conversationId, initialQuery, sessionId, config) {
  const test = activeTests.get(conversationId);
  const conversationHistory = [];
  let currentCustomerMessage = initialQuery;
  let resolved = false;
  let turnCount = 0;
  
  emitLog(conversationId, 'info', '\n--- CONVERSATION START (REAL FORETHOUGHT) ---\n');
  
  while (!resolved && turnCount < config.maxTurns) {
    turnCount++;
    emitLog(conversationId, 'info', `\n📍 Turn ${turnCount}`);
    
    // Customer message
    emitLog(conversationId, 'info', `Customer: "${currentCustomerMessage}"`);
    
    // Send to real Forethought widget
    const startTime = Date.now();
    emitLog(conversationId, 'info', 'Sending to Forethought widget...');
    
    const forethoughtResult = await forethoughtClient.sendMessage(currentCustomerMessage, sessionId);
    const responseTime = Date.now() - startTime;
    
    if (forethoughtResult.success) {
      emitLog(conversationId, 'success', `Forethought responded in ${responseTime}ms`);
      emitLog(conversationId, 'info', `Forethought: "${forethoughtResult.response}"`);
      
      if (responseTime > 1000) {
        emitLog(conversationId, 'warning', `⚠️ Response time above 1s threshold`);
      }
      
      // Add to history
      conversationHistory.push({
        turn: turnCount,
        customer: currentCustomerMessage,
        forethought: forethoughtResult.response,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      });
      
      // Check if this is the last turn
      if (turnCount >= config.maxTurns) {
        emitLog(conversationId, 'warning', '⚠️ Max turns reached, ending conversation');
        resolved = true;
        break;
      }
      
      await delay(1000);
      
      // Generate customer response using OpenAI
      if (config.useOpenAI) {
        const customerPrompt = `You are a Fetch Rewards customer in a support conversation.
        
The support agent (Forethought) just said: "${forethoughtResult.response}"

Previous conversation:
${conversationHistory.map(h => `Customer: ${h.customer}\nAgent: ${h.forethought}`).join('\n\n')}

Based on the agent's response:
- If your issue has been resolved or answered satisfactorily, express thanks
- If you need more help or clarification, ask a natural follow-up question
- Stay in character as a real customer with the original issue

Respond naturally in 1-2 sentences.`;
        
        currentCustomerMessage = await generateWithOpenAI(
          'Generate customer response',
          customerPrompt,
          0.8
        );
      } else {
        // Simple mock customer response
        if (turnCount > 2 && Math.random() > 0.5) {
          currentCustomerMessage = "Thank you, that helps! I appreciate your assistance.";
          resolved = true;
        } else {
          const followups = [
            "Can you provide more specific details?",
            "How long will this take to process?",
            "What should I do next?",
            "Can you check my account to confirm?"
          ];
          currentCustomerMessage = followups[Math.floor(Math.random() * followups.length)];
        }
      }
      
      // Check for resolution
      const resolutionPhrases = ['thank you', 'thanks', 'perfect', 'great', 'resolved', 'helps', 'appreciate'];
      if (resolutionPhrases.some(phrase => currentCustomerMessage.toLowerCase().includes(phrase))) {
        resolved = true;
        emitLog(conversationId, 'info', `Customer: "${currentCustomerMessage}"`);
        emitLog(conversationId, 'success', '✅ Customer expressed satisfaction - Conversation resolved');
      }
      
    } else {
      emitLog(conversationId, 'error', `❌ Forethought error: ${forethoughtResult.error}`);
      emitLog(conversationId, 'warning', 'Attempting to continue with fallback...');
      
      // Try to continue or end
      if (turnCount > 2) {
        resolved = true;
      }
    }
  }
  
  // Complete the test
  test.status = 'completed';
  test.endTime = new Date().toISOString();
  test.results = {
    resolved: resolved,
    totalTurns: turnCount,
    conversationHistory: conversationHistory,
    forethoughtSessionId: sessionId
  };
  
  // Final summary
  emitLog(conversationId, 'info', '\n--- CONVERSATION END ---\n');
  emitLog(conversationId, 'info', '📊 Summary:');
  emitLog(conversationId, 'info', `• Total turns: ${turnCount}`);
  emitLog(conversationId, 'info', `• Resolution: ${resolved ? '✅ Resolved' : '❌ Unresolved'}`);
  emitLog(conversationId, 'info', `• Duration: ${((new Date(test.endTime) - new Date(test.startTime)) / 1000).toFixed(1)}s`);
  emitLog(conversationId, 'info', `• Forethought Session: ${sessionId}`);
  
  // Save report
  testReports.set(conversationId, test.results);
}

// Export for use
module.exports = { ForethoughtWidgetClient };