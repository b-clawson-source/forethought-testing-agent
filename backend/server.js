const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Personas endpoint
app.get('/api/personas', (req, res) => {
  res.json({
    success: true,
    data: {
      personas: [
        {
          type: 'frustrated_customer',
          name: 'Frustrated Customer',
          description: 'A customer experiencing repeated technical difficulties',
          characteristics: ['impatient', 'needs quick solutions', 'may express dissatisfaction']
        },
        {
          type: 'confused_elderly',
          name: 'Confused Elderly',
          description: 'An elderly person needing patient, clear explanations',
          characteristics: ['not tech-savvy', 'needs clarification', 'patient']
        },
        {
          type: 'angry_billing',
          name: 'Angry Billing',
          description: 'Upset about unexpected charges',
          characteristics: ['focused on money', 'demands explanations', 'wants refunds']
        },
        {
          type: 'new_user',
          name: 'New User',
          description: 'Someone new to the service',
          characteristics: ['curious', 'asks basic questions', 'learning']
        },
        {
          type: 'technical_expert',
          name: 'Technical Expert',
          description: 'Technically proficient user needing advanced help',
          characteristics: ['uses technical language', 'expects detailed answers', 'knowledgeable']
        },
        {
          type: 'happy_customer',
          name: 'Happy Customer',
          description: 'A satisfied customer with minor inquiries',
          characteristics: ['polite', 'reasonable', 'appreciative']
        }
      ]
    }
  });
});

// Store conversations in memory (replace with database in production)
const conversations = new Map();

// Get all conversations
app.get('/api/conversations', (req, res) => {
  const conversationList = Array.from(conversations.values());
  res.json({
    success: true,
    data: {
      conversations: conversationList,
      total: conversationList.length,
      active: conversationList.filter(c => c.status === 'active').length
    }
  });
});

// Create new conversation
app.post('/api/conversations', (req, res) => {
  const { initialPrompt, persona } = req.body;
  
  const conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    initialPrompt,
    persona,
    status: 'active',
    startTime: new Date().toISOString(),
    messageCount: 1,
    messages: [
      {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: initialPrompt,
        timestamp: new Date().toISOString()
      }
    ],
    turnCount: 1
  };
  
  conversations.set(conversation.id, conversation);
  
  // Simulate AI response
  setTimeout(() => {
    const aiResponse = {
      id: `msg_${Date.now()}_ai`,
      role: 'assistant',
      content: `I understand you want to test with the ${persona} persona. Your initial prompt was: "${initialPrompt}". How can I help you today?`,
      timestamp: new Date().toISOString(),
      metadata: {
        intent: 'greeting',
        confidence: 0.95
      }
    };
    
    conversation.messages.push(aiResponse);
    conversation.messageCount += 1;
  }, 500);
  
  res.json({
    success: true,
    data: {
      session: conversation
    }
  });
});

// Get specific conversation
app.get('/api/conversations/:sessionId', (req, res) => {
  const conversation = conversations.get(req.params.sessionId);
  
  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: 'Conversation not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      session: conversation
    }
  });
});

// Continue conversation
app.post('/api/conversations/:sessionId/continue', (req, res) => {
  const conversation = conversations.get(req.params.sessionId);
  
  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: 'Conversation not found'
    });
  }
  
  // Add a simulated response
  const newMessage = {
    id: `msg_${Date.now()}_cont`,
    role: 'assistant',
    content: 'This is a continued response in the conversation.',
    timestamp: new Date().toISOString(),
    metadata: {
      intent: 'continuation',
      confidence: 0.92
    }
  };
  
  conversation.messages.push(newMessage);
  conversation.messageCount += 1;
  
  res.json({
    success: true,
    data: {
      session: conversation,
      newMessages: [newMessage]
    }
  });
});

// Import and use test routes if TypeScript compilation is set up
// If using TypeScript, compile first then uncomment:
// const testRoutes = require('./dist/routes/tests');
// app.use('/api/tests', testRoutes);

// For now, let's add the test routes directly
const { TestController } = require('./testController'); // You'll need to compile or convert to JS
const testController = new TestController();

app.post('/api/tests/start', (req, res) => testController.startTestCycle(req, res));
app.get('/api/tests/status/:testId', (req, res) => testController.getTestStatus(req, res));
app.get('/api/tests/reports', (req, res) => testController.getTestReports(req, res));
app.get('/api/tests/reports/:reportId', (req, res) => testController.getTestReport(req, res));
app.get('/api/tests/active', (req, res) => testController.getActiveTests(req, res));

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/personas');
  console.log('  GET  /api/conversations');
  console.log('  POST /api/conversations');
  console.log('  GET  /api/conversations/:sessionId');
  console.log('  POST /api/conversations/:sessionId/continue');
  console.log('\nTest Automation endpoints:');
  console.log('  POST /api/tests/start');
  console.log('  GET  /api/tests/status/:testId');
  console.log('  GET  /api/tests/reports');
  console.log('  GET  /api/tests/reports/:reportId');
  console.log('  GET  /api/tests/active');
});