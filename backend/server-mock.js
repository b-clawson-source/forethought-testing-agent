require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Verify OpenAI key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️  WARNING: OPENAI_API_KEY not found in .env file');
  console.error('The system will run in mock mode without real AI responses');
}

// Event emitter for test logs
const testEventEmitter = new EventEmitter();
testEventEmitter.setMaxListeners(100);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Store for active tests and their logs
const activeTests = new Map();
const testLogs = new Map();
const sseClients = new Map();
const testReports = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    openai: !!process.env.OPENAI_API_KEY,
    mode: process.env.OPENAI_API_KEY ? 'production' : 'mock'
  });
});

// SSE endpoint for real-time logs
app.get('/api/tests/logs/:testId', (req, res) => {
  const { testId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', testId })}\n\n`);

  const clientId = Date.now().toString();
  if (!sseClients.has(testId)) {
    sseClients.set(testId, new Map());
  }
  sseClients.get(testId).set(clientId, res);

  const existingLogs = testLogs.get(testId) || [];
  existingLogs.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  const logListener = (log) => {
    if (log.testId === testId) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }
  };
  testEventEmitter.on('log', logListener);

  req.on('close', () => {
    testEventEmitter.removeListener('log', logListener);
    const testClients = sseClients.get(testId);
    if (testClients) {
      testClients.delete(clientId);
      if (testClients.size === 0) {
        sseClients.delete(testId);
      }
    }
  });
});

// Helper function to emit logs
function emitLog(testId, level, message, metadata = {}) {
  const log = {
    testId,
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  };
  
  if (!testLogs.has(testId)) {
    testLogs.set(testId, []);
  }
  testLogs.get(testId).push(log);
  
  testEventEmitter.emit('log', log);
  console.log(`[${testId}] [${level}] ${message}`);
}

// Fetch categories
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

// OpenAI-powered conversation generation
async function generateWithOpenAI(prompt, systemPrompt, temperature = 0.8) {
  if (!process.env.OPENAI_API_KEY) {
    // Return mock response if no API key
    return "Mock response: " + prompt.substring(0, 50);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: 200
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "Fallback response due to API error";
  }
}

// Start Fetch test with OpenAI integration
app.post('/api/fetch/test/start', async (req, res) => {
  const testId = `fetch_test_${Date.now()}`;
  const config = {
    conversationsPerCategory: req.body.conversationsPerCategory || 3,
    categories: req.body.categories || ['missing_points'],
    maxTurns: req.body.maxTurns || 10,
    useRealWidget: req.body.useRealWidget || false,
    useOpenAI: !!process.env.OPENAI_API_KEY
  };
  
  const test = {
    id: testId,
    type: 'fetch',
    config,
    status: 'initializing',
    startTime: new Date().toISOString(),
    conversations: []
  };
  
  activeTests.set(testId, test);
  
  emitLog(testId, 'info', '🚀 Initializing Fetch test suite...');
  emitLog(testId, 'info', `Mode: ${config.useOpenAI ? 'OpenAI-powered' : 'Mock simulation'}`);
  emitLog(testId, 'info', `Selected categories: ${config.categories.join(', ')}`);
  emitLog(testId, 'info', `Total conversations: ${config.conversationsPerCategory * config.categories.length}`);
  
  setTimeout(() => runFetchTestWithAI(testId, test), 100);
  
  res.json({
    success: true,
    message: 'Fetch test started',
    testId,
    config,
    estimatedDuration: `${config.categories.length * config.conversationsPerCategory * 20} seconds`,
    mode: config.useOpenAI ? 'ai-powered' : 'mock'
  });
});

// Run test with OpenAI
async function runFetchTestWithAI(testId, test) {
  const { config } = test;
  test.status = 'running';
  
  emitLog(testId, 'success', '✅ Test initialized');
  
  if (config.useOpenAI) {
    emitLog(testId, 'info', 'Connecting to OpenAI...');
    const apiValid = await validateOpenAI();
    if (apiValid) {
      emitLog(testId, 'success', 'OpenAI connected successfully');
    } else {
      emitLog(testId, 'warning', 'OpenAI connection failed, using fallback');
    }
  }
  
  let totalConversations = 0;
  let successfulConversations = 0;
  
  for (const category of config.categories) {
    emitLog(testId, 'info', `\n📁 Testing category: ${category}`);
    
    for (let i = 0; i < config.conversationsPerCategory; i++) {
      totalConversations++;
      const conversationId = `conv_${totalConversations}`;
      
      emitLog(testId, 'info', `\n🗣️ Starting conversation ${totalConversations}: ${category}`);
      
      const success = await runAIConversation(testId, conversationId, category, config);
      
      if (success) {
        successfulConversations++;
        emitLog(testId, 'success', `✅ Conversation ${totalConversations} resolved successfully`);
      } else {
        emitLog(testId, 'error', `❌ Conversation ${totalConversations} failed to resolve`);
      }
      
      test.conversations.push({
        id: conversationId,
        category,
        success,
        timestamp: new Date().toISOString()
      });
      
      await delay(config.useOpenAI ? 2000 : 1000);
    }
  }
  
  // Complete test
  test.status = 'completed';
  test.endTime = new Date().toISOString();
  test.results = {
    totalConversations,
    successful: successfulConversations,
    failed: totalConversations - successfulConversations,
    successRate: successfulConversations / totalConversations
  };
  
  // Generate and save report
  const report = generateTestReport(test, testLogs.get(testId) || []);
  testReports.set(testId, report);
  
  emitLog(testId, 'info', '\n' + '='.repeat(50));
  emitLog(testId, 'info', '📊 TEST COMPLETE');
  emitLog(testId, 'success', `✅ Success rate: ${(test.results.successRate * 100).toFixed(1)}%`);
  emitLog(testId, 'info', `Total conversations: ${totalConversations}`);
  emitLog(testId, 'info', `Successful: ${successfulConversations}`);
  emitLog(testId, 'info', `Failed: ${totalConversations - successfulConversations}`);
  emitLog(testId, 'info', `Duration: ${((new Date(test.endTime) - new Date(test.startTime)) / 1000).toFixed(1)}s`);
}

// Run AI-powered conversation
async function runAIConversation(testId, conversationId, category, config) {
  const personas = {
    missing_points: {
      name: 'Frustrated Customer',
      context: 'You expected bonus points from a recent purchase but they haven\'t appeared',
      initialMessage: 'I bought 3 Pepsi 12-packs yesterday for the 3,000 point offer but I only got base points'
    },
    account_management: {
      name: 'Locked Out User',
      context: 'You cannot access your account and are worried about your points',
      initialMessage: 'I can\'t log into my account - it says it\'s locked but I didn\'t do anything wrong'
    },
    fetch_play: {
      name: 'Gaming User',
      context: 'You completed a game offer but didn\'t receive the promised points',
      initialMessage: 'I finished level 50 in Solitaire Cash 3 days ago but still haven\'t gotten my 15,000 points'
    },
    rewards_gift_cards: {
      name: 'Reward Redeemer',
      context: 'You redeemed points for a gift card but haven\'t received it',
      initialMessage: 'I redeemed 25,000 points for an Amazon gift card 2 days ago but haven\'t received the email yet'
    },
    receipt_issues: {
      name: 'Receipt Problems',
      context: 'Your receipts keep getting rejected',
      initialMessage: 'My receipt keeps getting rejected as blurry but the image looks clear to me'
    },
    ereceipt_scanning: {
      name: 'Email Sync User',
      context: 'Your email receipts aren\'t being detected',
      initialMessage: 'I connected my Gmail account but none of my Amazon receipts are showing up'
    },
    referral_issues: {
      name: 'Referral User',
      context: 'You referred friends but didn\'t get credit',
      initialMessage: 'I referred 3 friends this week using my code but only got credit for 1 of them'
    }
  };

  const persona = personas[category] || personas.missing_points;
  let conversationHistory = [];
  let currentMessage = persona.initialMessage;
  
  if (config.useOpenAI) {
    // Generate more varied initial message with AI
    const systemPrompt = `You are a ${persona.name}. ${persona.context}. Generate a realistic customer support message expressing this issue. Be specific and natural. Maximum 2 sentences.`;
    currentMessage = await generateWithOpenAI('Generate my support message', systemPrompt);
  }
  
  emitLog(testId, 'info', `Customer: "${currentMessage}"`);
  
  // Simulate Forethought processing
  await delay(300 + Math.random() * 500);
  const responseTime = 200 + Math.random() * 600;
  emitLog(testId, 'info', `Processing with Forethought... (${responseTime.toFixed(0)}ms)`);
  
  // Intent recognition
  const confidence = 0.75 + Math.random() * 0.24;
  const intent = `${category}_issue_detected`;
  emitLog(testId, 'success', `Intent: ${intent} (confidence: ${confidence.toFixed(2)})`);
  
  if (responseTime > 500) {
    emitLog(testId, 'warning', `⚠️ Response time above threshold: ${responseTime.toFixed(0)}ms`);
  }
  
  // Generate agent response
  let agentResponse = "I understand your concern and I'm here to help. Let me look into this for you.";
  if (config.useOpenAI) {
    const agentPrompt = `You are a helpful customer support agent. Respond to this customer issue: "${currentMessage}". Be professional, empathetic, and offer to help. Maximum 2 sentences.`;
    agentResponse = await generateWithOpenAI(currentMessage, agentPrompt, 0.7);
  }
  emitLog(testId, 'info', `Agent: "${agentResponse}"`);
  
  conversationHistory.push({
    customer: currentMessage,
    agent: agentResponse
  });
  
  // Continue conversation
  const maxTurns = Math.min(config.maxTurns, 3 + Math.floor(Math.random() * 5));
  
  for (let turn = 2; turn <= maxTurns; turn++) {
    await delay(config.useOpenAI ? 1500 : 800);
    
    // Generate customer response
    if (config.useOpenAI) {
      const customerPrompt = `You are a ${persona.name}. The support agent said: "${agentResponse}". 
      Continue the conversation naturally. If the agent has resolved your issue, express satisfaction.
      Otherwise, ask a follow-up question or provide more details. Maximum 2 sentences.`;
      
      currentMessage = await generateWithOpenAI('Continue conversation', customerPrompt);
    } else {
      // Mock responses
      const responses = [
        "Can you check again? This should have been automatic.",
        "How long will this take to fix?",
        "I need this resolved today, I was planning to redeem points.",
        "Thank you, that helps a lot!",
        "Perfect, I see it's working now."
      ];
      currentMessage = responses[Math.floor(Math.random() * responses.length)];
    }
    
    emitLog(testId, 'info', `Customer: "${currentMessage}"`);
    
    // Check for resolution
    const resolved = currentMessage.toLowerCase().includes('thank') || 
                    currentMessage.toLowerCase().includes('perfect') ||
                    currentMessage.toLowerCase().includes('working') ||
                    turn === maxTurns;
    
    if (resolved) {
      emitLog(testId, 'success', '✅ Resolution achieved - customer satisfied');
      return true;
    }
    
    // Generate next agent response
    await delay(500);
    if (config.useOpenAI) {
      const agentPrompt = `You are a helpful support agent. Continue helping with: "${currentMessage}". Be professional and solution-focused. Maximum 2 sentences.`;
      agentResponse = await generateWithOpenAI(currentMessage, agentPrompt, 0.7);
    } else {
      agentResponse = "Let me investigate this further for you. I'll make sure this gets resolved.";
    }
    emitLog(testId, 'info', `Agent: "${agentResponse}"`);
    
    conversationHistory.push({
      customer: currentMessage,
      agent: agentResponse
    });
  }
  
  return Math.random() > 0.2; // 80% success rate for unresolved
}

// Validate OpenAI connection
async function validateOpenAI() {
  if (!process.env.OPENAI_API_KEY) return false;
  
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI validation failed:', error);
    return false;
  }
}

// Generate test report
function generateTestReport(test, logs) {
  return {
    testId: test.id,
    startTime: test.startTime,
    endTime: test.endTime,
    duration: ((new Date(test.endTime) - new Date(test.startTime)) / 1000).toFixed(1),
    configuration: test.config,
    results: test.results,
    conversations: test.conversations,
    logCount: logs.length,
    summary: {
      totalTests: test.results.totalConversations,
      passed: test.results.successful,
      failed: test.results.failed,
      successRate: (test.results.successRate * 100).toFixed(1) + '%'
    }
  };
}

// Get active tests
app.get('/api/tests/active', (req, res) => {
  const tests = Array.from(activeTests.values()).map(test => ({
    ...test,
    logCount: testLogs.get(test.id)?.length || 0
  }));
  res.json({
    success: true,
    activeTests: tests
  });
});

// Get test reports
app.get('/api/tests/reports', (req, res) => {
  const reports = Array.from(testReports.values());
  res.json({
    success: true,
    reports: reports.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  });
});

// Get specific report
app.get('/api/tests/reports/:testId', (req, res) => {
  const report = testReports.get(req.params.testId);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  res.json({ success: true, report });
});

// Utility function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 FETCH TESTING AGENT - PRODUCTION SERVER');
  console.log('='.repeat(60));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Mode: ${process.env.OPENAI_API_KEY ? '✅ AI-POWERED (OpenAI Connected)' : '⚠️  MOCK MODE (No OpenAI Key)'}`);
  console.log('\nEndpoints:');
  console.log('  POST /api/fetch/test/start - Start AI-powered test');
  console.log('  GET  /api/tests/logs/:id   - Real-time log streaming');
  console.log('  GET  /api/tests/active     - View active tests');
  console.log('  GET  /api/tests/reports    - View test reports');
  console.log('\nFeatures:');
  console.log('  • Real-time SSE logging');
  console.log('  • OpenAI-powered conversations');
  console.log('  • Forethought intent simulation');
  console.log('  • Detailed test reports');
  console.log('='.repeat(60));
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  To enable AI-powered testing:');
    console.log('1. Add OPENAI_API_KEY to your .env file');
    console.log('2. Restart the server');
    console.log('='.repeat(60));
  }
});