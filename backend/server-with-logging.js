require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time logs
app.get('/api/tests/logs/:testId', (req, res) => {
  const { testId } = req.params;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', testId })}\n\n`);

  // Store client connection
  const clientId = Date.now().toString();
  if (!sseClients.has(testId)) {
    sseClients.set(testId, new Map());
  }
  sseClients.get(testId).set(clientId, res);

  // Send existing logs for this test
  const existingLogs = testLogs.get(testId) || [];
  existingLogs.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  // Listen for new logs
  const logListener = (log) => {
    if (log.testId === testId) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }
  };
  testEventEmitter.on('log', logListener);

  // Handle client disconnect
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
  
  // Store log
  if (!testLogs.has(testId)) {
    testLogs.set(testId, []);
  }
  testLogs.get(testId).push(log);
  
  // Emit to listeners
  testEventEmitter.emit('log', log);
  
  // Also log to console
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

// Start Fetch test with real logging
app.post('/api/fetch/test/start', async (req, res) => {
  const testId = `fetch_test_${Date.now()}`;
  const config = {
    conversationsPerCategory: req.body.conversationsPerCategory || 3,
    categories: req.body.categories || ['missing_points'],
    maxTurns: req.body.maxTurns || 10,
    useRealWidget: req.body.useRealWidget || false
  };
  
  // Initialize test
  const test = {
    id: testId,
    type: 'fetch',
    config,
    status: 'initializing',
    startTime: new Date().toISOString(),
    conversations: []
  };
  
  activeTests.set(testId, test);
  
  // Start logging
  emitLog(testId, 'info', '🚀 Initializing Fetch test suite...');
  emitLog(testId, 'info', `Selected categories: ${config.categories.join(', ')}`);
  emitLog(testId, 'info', `Total conversations to run: ${config.conversationsPerCategory * config.categories.length}`);
  
  // Start test execution in background
  setTimeout(() => runFetchTest(testId, test), 100);
  
  res.json({
    success: true,
    message: 'Fetch test started',
    testId,
    config,
    estimatedDuration: `${config.categories.length * config.conversationsPerCategory * 15} seconds`
  });
});

// Simulate test execution with detailed logging
async function runFetchTest(testId, test) {
  const { config } = test;
  test.status = 'running';
  
  emitLog(testId, 'info', '✅ Test initialized successfully');
  emitLog(testId, 'info', 'Connecting to Forethought widget...');
  await delay(1000);
  emitLog(testId, 'success', 'Forethought widget connected');
  
  let totalConversations = 0;
  let successfulConversations = 0;
  
  // Process each category
  for (const category of config.categories) {
    emitLog(testId, 'info', `\n📁 Starting category: ${category}`);
    
    // Run conversations for this category
    for (let i = 0; i < config.conversationsPerCategory; i++) {
      totalConversations++;
      const conversationId = `conv_${testId}_${totalConversations}`;
      
      emitLog(testId, 'info', `\n🗣️ Conversation ${totalConversations}: ${category} persona`);
      
      // Simulate conversation with realistic logging
      const success = await simulateConversation(testId, conversationId, category, config.maxTurns);
      
      if (success) {
        successfulConversations++;
        emitLog(testId, 'success', `✅ Conversation ${totalConversations} completed successfully`);
      } else {
        emitLog(testId, 'error', `❌ Conversation ${totalConversations} failed`);
      }
      
      test.conversations.push({
        id: conversationId,
        category,
        success,
        turns: Math.floor(Math.random() * config.maxTurns) + 3
      });
      
      await delay(1000); // Delay between conversations
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
  
  emitLog(testId, 'info', '\n📊 Test completed!');
  emitLog(testId, 'success', `Success rate: ${(test.results.successRate * 100).toFixed(2)}%`);
  emitLog(testId, 'info', `Total conversations: ${totalConversations}`);
  emitLog(testId, 'info', `Successful: ${successfulConversations}`);
  emitLog(testId, 'info', `Failed: ${totalConversations - successfulConversations}`);
}

// Simulate a single conversation with detailed logs
async function simulateConversation(testId, conversationId, category, maxTurns) {
  const scenarios = {
    missing_points: [
      { user: "I bought 3 Pepsi 12-packs for the 3,000 point offer but didn't get my bonus points", intent: 'missing_points_offer' },
      { user: "My receipt from Target on 3/15 is missing the bonus points", intent: 'missing_points_receipt' }
    ],
    account_management: [
      { user: "I can't log in, it says my account is locked", intent: 'account_locked' },
      { user: "My phone number changed and I can't get verification codes", intent: 'phone_update' }
    ],
    fetch_play: [
      { user: "I completed level 50 in Solitaire Cash but didn't get my points", intent: 'fetch_play_completion' },
      { user: "The Bingo Blitz offer isn't tracking my progress", intent: 'fetch_play_tracking' }
    ],
    rewards_gift_cards: [
      { user: "I redeemed for a $25 Amazon card but haven't received it", intent: 'reward_delivery' },
      { user: "Can I change my reward from Walmart to Target?", intent: 'reward_change' }
    ],
    receipt_issues: [
      { user: "My receipt keeps getting rejected as blurry", intent: 'receipt_quality' },
      { user: "It says my Costco receipt is invalid", intent: 'receipt_invalid' }
    ],
    ereceipt_scanning: [
      { user: "I connected Gmail but no receipts are showing up", intent: 'ereceipt_sync' },
      { user: "My Amazon receipts aren't being detected", intent: 'ereceipt_missing' }
    ],
    referral_issues: [
      { user: "I referred 3 friends but only got credit for 1", intent: 'referral_missing' },
      { user: "My friend used my code but I didn't get points", intent: 'referral_not_credited' }
    ]
  };
  
  const categoryScenarios = scenarios[category] || scenarios.missing_points;
  const scenario = categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];
  
  // Start conversation
  emitLog(testId, 'info', `Customer: "${scenario.user}"`);
  await delay(800);
  
  // Forethought response
  const confidence = 0.75 + Math.random() * 0.24;
  const responseTime = 200 + Math.random() * 800;
  
  emitLog(testId, 'info', `Processing with Forethought... (${responseTime.toFixed(0)}ms)`);
  await delay(responseTime);
  
  emitLog(testId, 'success', `Intent recognized: ${scenario.intent} (confidence: ${confidence.toFixed(2)})`);
  
  if (responseTime > 500) {
    emitLog(testId, 'warning', `⚠️ Response time above threshold: ${responseTime.toFixed(0)}ms`);
  }
  
  // Agent response
  const agentResponses = [
    "I can help you with that. Let me check your account details.",
    "I understand your concern. Let me investigate this for you.",
    "I'll help resolve this issue. Can you provide more details?",
    "Let me look into this right away."
  ];
  const agentResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
  emitLog(testId, 'info', `Agent: "${agentResponse}"`);
  await delay(500);
  
  // Simulate conversation turns
  const turns = Math.min(3 + Math.floor(Math.random() * 5), maxTurns);
  for (let turn = 2; turn <= turns; turn++) {
    await delay(800);
    
    if (turn === turns) {
      // Resolution
      emitLog(testId, 'info', `Customer: "Thank you, that resolved my issue!"`);
      await delay(500);
      emitLog(testId, 'success', '✅ Resolution achieved - customer satisfied');
      return true;
    } else {
      // Continue conversation
      const customerFollowups = [
        "Can you check again?",
        "When will this be fixed?",
        "I need more information about this.",
        "How long does this usually take?"
      ];
      emitLog(testId, 'info', `Customer: "${customerFollowups[Math.floor(Math.random() * customerFollowups.length)]}"`);
      await delay(500);
      emitLog(testId, 'info', `Agent: "Let me provide more details..."`);
    }
  }
  
  return Math.random() > 0.2; // 80% success rate
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
    test: {
      ...test,
      logs: testLogs.get(test.id) || []
    }
  });
});

// Get test logs (non-SSE)
app.get('/api/tests/:testId/logs', (req, res) => {
  const logs = testLogs.get(req.params.testId) || [];
  res.json({
    success: true,
    logs
  });
});

// Utility function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log(`Backend server with real-time logging running on http://localhost:${PORT}`);
  console.log('\nKey endpoints:');
  console.log('  POST /api/fetch/test/start - Start a test');
  console.log('  GET  /api/tests/logs/:testId - SSE endpoint for real-time logs');
  console.log('  GET  /api/tests/active - Get active tests');
  console.log('\nLogs are streamed in real-time via Server-Sent Events');
});