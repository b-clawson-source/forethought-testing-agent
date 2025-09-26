require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
          type: 'happy_customer',
          name: 'Happy Customer',
          description: 'A satisfied customer with minor inquiries',
          characteristics: ['polite', 'reasonable', 'appreciative']
        }
      ]
    }
  });
});

// Store conversations in memory
const conversations = new Map();
const activeTests = new Map();

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

// Basic test endpoint (simplified)
app.post('/api/tests/start', (req, res) => {
  const testId = `test_${Date.now()}`;
  const config = req.body;
  
  console.log('Test started with config:', config);
  
  // Store test info
  activeTests.set(testId, {
    id: testId,
    config,
    status: 'running',
    startTime: new Date().toISOString()
  });
  
  // Simulate test completion after 5 seconds
  setTimeout(() => {
    const test = activeTests.get(testId);
    if (test) {
      test.status = 'completed';
      test.endTime = new Date().toISOString();
      console.log(`Test ${testId} completed`);
    }
  }, 5000);
  
  res.json({
    success: true,
    message: 'Test started',
    testId,
    config
  });
});

// Get active tests
app.get('/api/tests/active', (req, res) => {
  const tests = Array.from(activeTests.values());
  res.json({
    success: true,
    activeTests: tests
  });
});

// Get test status
app.get('/api/tests/status/:testId', (req, res) => {
  const test = activeTests.get(req.params.testId);
  
  if (!test) {
    return res.status(404).json({
      success: false,
      error: 'Test not found'
    });
  }
  
  res.json({
    success: true,
    test
  });
});

// Fetch-specific categories endpoint
app.get('/api/fetch/categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      { id: 'missing_points', name: 'Missing Points', description: 'Points not credited from receipts, offers, or bonuses' },
      { id: 'account_management', name: 'Account Management', description: 'Login issues, profile updates, account access' },
      { id: 'fetch_play', name: 'Fetch Play Apps/Games', description: 'Game and app completion tracking issues' },
      { id: 'rewards_gift_cards', name: 'Rewards & Gift Cards', description: 'Redemption and delivery issues' },
      { id: 'receipt_issues', name: 'Receipt Issues', description: 'Receipt rejection and quality problems' },
      { id: 'ereceipt_scanning', name: 'eReceipt Scanning', description: 'Email connection and sync issues' },
      { id: 'referral_issues', name: 'Referral Issues', description: 'Referral credit and code problems' }
    ]
  });
});

// Simple Fetch test endpoint
app.post('/api/fetch/test/start', (req, res) => {
  const testId = `fetch_test_${Date.now()}`;
  const config = {
    conversationsPerCategory: req.body.conversationsPerCategory || 3,
    categories: req.body.categories || ['missing_points'],
    maxTurns: req.body.maxTurns || 10,
    useRealWidget: req.body.useRealWidget || false
  };
  
  console.log('Fetch test started:', config);
  
  // Mock test execution
  activeTests.set(testId, {
    id: testId,
    type: 'fetch',
    config,
    status: 'running',
    startTime: new Date().toISOString(),
    estimatedDuration: '2 minutes'
  });
  
  // Simulate test completion
  setTimeout(() => {
    const test = activeTests.get(testId);
    if (test) {
      test.status = 'completed';
      test.endTime = new Date().toISOString();
      test.results = {
        totalConversations: config.conversationsPerCategory * config.categories.length,
        successful: Math.floor(config.conversationsPerCategory * config.categories.length * 0.8),
        failed: Math.floor(config.conversationsPerCategory * config.categories.length * 0.2),
        successRate: 0.8
      };
      console.log(`Fetch test ${testId} completed`);
    }
  }, 10000);
  
  res.json({
    success: true,
    message: 'Fetch test started',
    testId,
    config,
    estimatedDuration: '2 minutes',
    note: 'This is a mock test. To run real tests, you need to set up the TypeScript services with OpenAI integration.'
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/personas');
  console.log('  GET  /api/conversations');
  console.log('  POST /api/conversations');
  console.log('  GET  /api/fetch/categories');
  console.log('  POST /api/fetch/test/start');
  console.log('  GET  /api/tests/active');
  console.log('\nNOTE: This is a simplified mock server.');
  console.log('For real autonomous testing with OpenAI, you need to:');
  console.log('1. Add your OpenAI API key to .env');
  console.log('2. Set up the TypeScript services');
  console.log('3. Compile and run the full system');
});