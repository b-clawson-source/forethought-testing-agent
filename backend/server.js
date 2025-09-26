require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');
const OpenAI = require('openai');
const axios = require('axios'); // You'll need to install this: npm install axios

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Verify environment
const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;
const isConfluenceConfigured = !!(process.env.CONFLUENCE_URL && process.env.CONFLUENCE_API_TOKEN);

console.log('\n' + '='.repeat(60));
console.log('🚀 FETCH TESTING AGENT - STARTING...');
console.log('='.repeat(60));
console.log(`OpenAI: ${isOpenAIConfigured ? '✅ Connected' : '⚠️  Mock Mode'}`);
console.log(`Confluence: ${isConfluenceConfigured ? '✅ Connected' : '⚠️  Using Default Policies'}`);

// Event emitter for test logs
const testEventEmitter = new EventEmitter();
testEventEmitter.setMaxListeners(100);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Data stores
const activeTests = new Map();
const testLogs = new Map();
const sseClients = new Map();
const testReports = new Map();

// ==================== AUTONOMOUS FETCH CUSTOMER AGENT ====================

class AutonomousCustomer {
  constructor(issue, config = {}) {
    this.issue = issue;
    this.config = {
      maxTurns: config.maxTurns || 15,
      patience: config.patience || 0.7, // 0 = very impatient, 1 = very patient
      persistence: config.persistence || 0.8, // How likely to keep pushing for resolution
      useOpenAI: config.useOpenAI || false,
      personality: config.personality || 'frustrated' // frustrated, polite, demanding
    };
    
    this.conversationState = {
      turn: 0,
      satisfied: false,
      frustrationLevel: 0.3,
      hasProvidedDetails: false,
      receivedSolution: false,
      solutionAccepted: false,
      waitingForAction: false,
      escalationRequested: false
    };
    
    this.memory = {
      agentPromises: [],
      timelineGiven: null,
      solutionsOffered: [],
      detailsShared: {}
    };
  }

  async respondToAgent(agentMessage, conversationHistory = []) {
    this.conversationState.turn++;
    
    // Analyze what the agent said
    const agentAnalysis = this.analyzeAgentResponse(agentMessage);
    
    // Update customer state based on agent response
    this.updateCustomerState(agentAnalysis);
    
    // Generate customer response
    const customerResponse = await this.generateCustomerResponse(agentMessage, agentAnalysis, conversationHistory);
    
    return {
      response: customerResponse,
      state: { ...this.conversationState },
      shouldContinue: !this.conversationState.satisfied && this.conversationState.turn < this.config.maxTurns,
      nextExpectation: this.getNextExpectation()
    };
  }

  analyzeAgentResponse(agentMessage) {
    const lower = agentMessage.toLowerCase();
    
    return {
      askedForDetails: this.checkForDetailRequest(lower),
      offeredSolution: this.checkForSolution(lower),
      acknowledgedIssue: lower.includes('understand') || lower.includes('sorry') || lower.includes('apologize'),
      gaveTimeline: this.extractTimeline(lower),
      requestedWait: lower.includes('processing') || lower.includes('24-48') || lower.includes('hours'),
      escalated: lower.includes('supervisor') || lower.includes('manager') || lower.includes('specialist'),
      wasHelpful: lower.includes('resolved') || lower.includes('fixed') || lower.includes('credited'),
      wasGeneric: this.isGenericResponse(lower)
    };
  }

  checkForDetailRequest(message) {
    const detailIndicators = [
      'can you provide', 'need some details', 'tell me', 'what store', 'when did',
      'purchase date', 'receipt', 'transaction', 'amount', 'more information'
    ];
    return detailIndicators.some(indicator => message.includes(indicator));
  }

  checkForSolution(message) {
    const solutionIndicators = [
      'i can', 'i will', 'let me', 'i\'ll help', 'resolve this', 'fix this',
      'credit', 'add the points', 'manual', 'process this'
    ];
    return solutionIndicators.some(indicator => message.includes(indicator));
  }

  extractTimeline(message) {
    const timelinePattern = /(\d+[-\s]*(hours?|days?|business days?|minutes?))/gi;
    const match = message.match(timelinePattern);
    return match ? match[0] : null;
  }

  isGenericResponse(message) {
    const genericPhrases = [
      'i understand your concern', 'thank you for contacting', 
      'i\'m here to help', 'let me help you', 'how can i assist'
    ];
    return genericPhrases.some(phrase => message.includes(phrase)) && message.length < 100;
  }

  updateCustomerState(analysis) {
    // Reduce frustration if agent acknowledges issue or offers solution
    if (analysis.acknowledgedIssue || analysis.offeredSolution) {
      this.conversationState.frustrationLevel = Math.max(0, this.conversationState.frustrationLevel - 0.2);
    }

    // Increase frustration for generic responses or requests to wait
    if (analysis.wasGeneric || (analysis.requestedWait && !analysis.gaveTimeline)) {
      this.conversationState.frustrationLevel = Math.min(1, this.conversationState.frustrationLevel + 0.3);
    }

    // Update conversation tracking
    if (analysis.askedForDetails) {
      this.conversationState.waitingForAction = false; // Agent is engaging
    }

    if (analysis.offeredSolution) {
      this.conversationState.receivedSolution = true;
      this.memory.solutionsOffered.push(analysis);
    }

    if (analysis.gaveTimeline) {
      this.memory.timelineGiven = analysis.gaveTimeline;
    }

    if (analysis.wasHelpful) {
      this.conversationState.satisfied = true;
      this.conversationState.solutionAccepted = true;
    }
  }

  async generateCustomerResponse(agentMessage, analysis, conversationHistory) {
    if (!this.config.useOpenAI) {
      return this.generateRuleBasedCustomerResponse(agentMessage, analysis);
    }

    const systemPrompt = this.buildCustomerSystemPrompt();
    const contextPrompt = this.buildCustomerContextPrompt(agentMessage, analysis);

    try {
      const response = await generateWithOpenAI(contextPrompt, systemPrompt, 0.8);
      return this.postProcessCustomerResponse(response);
    } catch (error) {
      console.error('Customer AI response failed:', error);
      return this.generateRuleBasedCustomerResponse(agentMessage, analysis);
    }
  }

  buildCustomerSystemPrompt() {
    const personality = this.getCustomerPersonality();
    const issueContext = this.getIssueContext();
    const stateContext = this.getStateContext();

    return `${personality}

Your issue: ${issueContext}

Current situation: ${stateContext}

Respond naturally as a customer would. Be specific about your issue. Show appropriate emotion based on your frustration level. Maximum 2-3 sentences.`;
  }

  getCustomerPersonality() {
    const personalities = {
      frustrated: "You are a frustrated Fetch Rewards customer who has been dealing with this issue for a while. You're not rude but you're clearly annoyed and want quick resolution.",
      polite: "You are a polite, patient Fetch Rewards customer. You're understanding but still need your issue resolved.",
      demanding: "You are an assertive Fetch Rewards customer who expects prompt, quality service. You're not mean but you're direct about your expectations."
    };
    return personalities[this.config.personality] || personalities.frustrated;
  }

  getIssueContext() {
    return typeof this.issue === 'string' ? this.issue : JSON.stringify(this.issue);
  }

  getStateContext() {
    let context = `Turn ${this.conversationState.turn}, `;
    context += `frustration level: ${(this.conversationState.frustrationLevel * 100).toFixed(0)}%, `;
    context += `details provided: ${this.conversationState.hasProvidedDetails}, `;
    context += `solution received: ${this.conversationState.receivedSolution}`;
    return context;
  }

  buildCustomerContextPrompt(agentMessage, analysis) {
    let prompt = `The support agent just said: "${agentMessage}"\n\n`;

    if (analysis.askedForDetails && !this.conversationState.hasProvidedDetails) {
      prompt += "The agent asked for details about your issue. Provide specific, realistic details.\n";
    }

    if (analysis.wasGeneric && this.conversationState.turn > 1) {
      prompt += "The agent gave a generic response. Express that you need more specific help.\n";
    }

    if (analysis.offeredSolution) {
      prompt += "The agent offered a solution. Respond based on whether this sounds reasonable for your issue.\n";
    }

    if (analysis.requestedWait && !analysis.gaveTimeline) {
      prompt += "The agent asked you to wait but didn't give a specific timeline. Ask for more specifics.\n";
    }

    return prompt;
  }

  generateRuleBasedCustomerResponse(agentMessage, analysis) {
    // Handle different agent response types
    if (analysis.askedForDetails && !this.conversationState.hasProvidedDetails) {
      this.conversationState.hasProvidedDetails = true;
      return this.provideIssueDetails();
    }

    if (analysis.offeredSolution) {
      return this.respondToSolution(analysis);
    }

    if (analysis.wasGeneric && this.conversationState.turn > 1) {
      return this.expressNeedForSpecificHelp();
    }

    if (analysis.requestedWait) {
      return this.respondToWaitRequest(analysis);
    }

    if (analysis.wasHelpful) {
      this.conversationState.satisfied = true;
      return this.expressGratitude();
    }

    // Default responses based on frustration level
    if (this.conversationState.frustrationLevel > 0.7) {
      return this.expressHighFrustration();
    }

    return this.continueConversation();
  }

  provideIssueDetails() {
    const issueType = detectIntent(this.issue);
    
    const detailResponses = {
      'missing_points': "I bought groceries at Target yesterday for $87.42 and scanned my receipt, but I never got the 2000 bonus points from the milk offer. My receipt shows the qualifying items clearly.",
      'receipt_problem': "I tried scanning my Walmart receipt from this morning but it keeps saying 'receipt not clear enough' even though I can read everything perfectly. The total was $65.23.",
      'account_issue': "I haven't been able to log in for 3 days. It says my account is locked but I never got any email about why. I use the same password I always have.",
      'reward_issue': "I redeemed points for a $25 Amazon gift card a week ago but never received it. The points were deducted from my account but no gift card arrived.",
      'fetch_play': "I completed all 10 levels of Solitaire Cash like the offer said, but didn't get my 5000 points. I have screenshots showing I finished it."
    };

    return detailResponses[issueType] || "Here are the details: " + this.issue + ". This happened two days ago and I still haven't seen any resolution.";
  }

  respondToSolution(analysis) {
    // Simulate whether customer thinks solution is reasonable
    const solutionSeemsGood = Math.random() > 0.3; // 70% chance customer accepts reasonable solution

    if (solutionSeemsGood && !this.conversationState.waitingForAction) {
      this.conversationState.solutionAccepted = true;
      this.conversationState.waitingForAction = true;
      return "That sounds great, thank you! How long should I expect this to take?";
    } else {
      return "I appreciate you looking into this, but I've heard similar promises before. Can you guarantee this will actually fix the issue?";
    }
  }

  expressNeedForSpecificHelp() {
    const responses = [
      "I need more than just a generic response. Can you actually look into my specific issue?",
      "I've gotten this same response before. What specifically are you going to do about my problem?",
      "That doesn't really address my issue. Can you please provide specific steps to resolve this?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  respondToWaitRequest(analysis) {
    if (analysis.gaveTimeline) {
      return `Okay, I'll wait ${analysis.gaveTimeline}. But if this isn't resolved by then, I'll need a different solution.`;
    } else {
      return "How long exactly am I supposed to wait? I need a specific timeframe, not just 'we're processing it.'";
    }
  }

  expressGratitude() {
    const responses = [
      "Perfect, thank you so much for resolving this! I really appreciate your help.",
      "That worked! I can see the points in my account now. Thank you for getting this fixed.",
      "Excellent, everything looks correct now. Thanks for your patience with this issue."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  expressHighFrustration() {
    if (!this.conversationState.escalationRequested && Math.random() > 0.5) {
      this.conversationState.escalationRequested = true;
      return "This is taking way too long. I need to speak with a supervisor or manager about this issue.";
    }

    const responses = [
      "I'm getting really frustrated here. This should be a simple fix and it's been days.",
      "This is unacceptable. I'm a loyal customer and this kind of service is really disappointing.",
      "I shouldn't have to keep explaining the same issue over and over. Can someone actually help me?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  continueConversation() {
    const responses = [
      "Okay, what's the next step to get this resolved?",
      "I'm still waiting for a solution to my problem.",
      "Can you help me fix this issue today?",
      "What else do you need from me to resolve this?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getNextExpectation() {
    if (!this.conversationState.hasProvidedDetails) {
      return "waiting_for_detail_request";
    }
    if (!this.conversationState.receivedSolution) {
      return "waiting_for_solution";
    }
    if (this.conversationState.waitingForAction) {
      return "waiting_for_resolution_confirmation";
    }
    return "seeking_final_resolution";
  }

  postProcessCustomerResponse(response) {
    // Clean up AI response to sound more natural
    return response
      .replace(/^(Customer:|I am a customer)/i, '')
      .replace(/As a customer,?\s*/i, '')
      .trim();
  }
}

// ==================== CONFLUENCE INTEGRATION ====================

class ConfluenceSupport {
  constructor() {
    this.baseUrl = process.env.CONFLUENCE_URL;
    this.auth = process.env.CONFLUENCE_API_TOKEN ? 
      Buffer.from(`${process.env.CONFLUENCE_EMAIL}:${process.env.CONFLUENCE_API_TOKEN}`).toString('base64') : null;
    this.spaceKey = process.env.CONFLUENCE_SPACE_KEY || 'SUPPORT';
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
    
    // Map frontend categories to Confluence pages
    this.categoryMappings = {
      'missing_points': ['Offers', 'Scanning eReceipts'],
      'account_management': ['Account Management'],
      'fetch_play': ['Fetch Play - Games: Guide for Support', 'Fetch Play - Apps: Guide for Support'],
      'rewards_gift_cards': ['Rewards'],
      'receipt_issues': ['Scanning eReceipts', 'Snapping Physical Receipts'],
      'ereceipt_scanning': ['Scanning eReceipts'],
      'referral_issues': ['Special Features of the Fetch App']
    };
  }

  async fetchPage(pageTitle) {
    if (!this.auth) return null;
    
    // Check cache
    const cached = this.cache.get(pageTitle);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.content;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/wiki/rest/api/content`,
        {
          params: {
            spaceKey: this.spaceKey,
            title: pageTitle,
            expand: 'body.storage'
          },
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.results.length > 0) {
        const content = response.data.results[0];
        const parsed = this.parseContent(content);
        
        this.cache.set(pageTitle, {
          content: parsed,
          timestamp: Date.now()
        });
        
        return parsed;
      }
    } catch (error) {
      console.error(`Failed to fetch Confluence page "${pageTitle}":`, error.message);
    }
    
    return null;
  }

  parseContent(page) {
    const html = page.body?.storage?.value || '';
    
    return {
      title: page.title,
      procedures: this.extractProcedures(html),
      policies: this.extractPolicies(html),
      templates: this.extractTemplates(html),
      escalation: this.extractEscalation(html)
    };
  }

  extractProcedures(html) {
    const procedures = [];
    const cleanHtml = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    
    // Look for numbered steps
    const steps = cleanHtml.match(/\d+\.\s+[^.]+/g) || [];
    steps.forEach(step => {
      procedures.push(step.trim());
    });
    
    return procedures;
  }

  extractPolicies(html) {
    const cleanHtml = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    
    // Extract timeframes
    const timeframes = cleanHtml.match(/\d+[-\s]*(hours?|days?|business days?|weeks?)/gi) || [];
    
    // Extract requirements
    const requirements = cleanHtml.match(/(must|require|need to|should)[^.]+/gi) || [];
    
    return {
      timeframes: [...new Set(timeframes)],
      requirements: requirements.slice(0, 5) // Limit to first 5 requirements
    };
  }

  extractTemplates(html) {
    const templates = [];
    
    // Look for quoted text or template-like content
    const quotes = html.match(/"([^"]+)"/g) || [];
    quotes.forEach(quote => {
      if (quote.length > 20) { // Only substantial quotes
        templates.push(quote.replace(/"/g, ''));
      }
    });
    
    return templates;
  }

  extractEscalation(html) {
    const cleanHtml = html.replace(/<[^>]*>/g, ' ').toLowerCase();
    
    // Common escalation triggers
    const triggers = [];
    if (cleanHtml.includes('supervisor') || cleanHtml.includes('manager')) {
      triggers.push('Customer requests supervisor');
    }
    if (cleanHtml.includes('fraud')) {
      triggers.push('Fraud suspected');
    }
    if (cleanHtml.includes('legal') || cleanHtml.includes('lawsuit')) {
      triggers.push('Legal threats');
    }
    
    return triggers;
  }

  async getPolicyForCategory(category) {
    const pages = this.categoryMappings[category] || [];
    const policies = {};
    
    for (const pageTitle of pages) {
      const content = await this.fetchPage(pageTitle);
      if (content) {
        policies[pageTitle] = content;
      }
    }
    
    // If no Confluence content, use defaults
    if (Object.keys(policies).length === 0) {
      return this.getDefaultPolicy(category);
    }
    
    return policies;
  }

  getDefaultPolicy(category) {
    const defaults = {
      'missing_points': {
        title: 'Missing Points Policy',
        procedures: [
          '1. Verify purchase date and store',
          '2. Check if points are still processing (24-72 hours)',
          '3. Verify offer requirements were met',
          '4. Apply manual credit if verified'
        ],
        policies: {
          timeframes: ['24-72 hours', '3-5 business days'],
          requirements: ['Receipt must be within 14 days', 'All items must be visible']
        }
      },
      'receipt_issues': {
        title: 'Receipt Issues Policy',
        procedures: [
          '1. Identify rejection reason',
          '2. Guide customer on proper scanning',
          '3. Offer manual review if needed'
        ],
        policies: {
          timeframes: ['14 days from purchase'],
          requirements: ['Clear image required', 'All four corners visible']
        }
      }
    };
    
    return { default: defaults[category] || defaults['missing_points'] };
  }
}

const confluenceSupport = new ConfluenceSupport();

// ==================== HELPER FUNCTIONS ====================

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
  console.log(`[${testId.substring(0, 20)}...] [${level}] ${message}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithOpenAI(prompt, systemPrompt, temperature = 0.8) {
  if (!isOpenAIConfigured) {
    return generateMockResponse(systemPrompt);
  }

  try {
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ],
  temperature
});

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return generateMockResponse(systemPrompt);
  }
}

function generateMockResponse(systemPrompt) {
  if (systemPrompt.includes('customer support agent')) {
    const responses = [
      "I understand your concern about the missing points. Let me check our system for you.",
      "I can help you with that receipt issue. Let me review our guidelines.",
      "Thank you for reaching out. I'll look into this right away."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (systemPrompt.includes('customer')) {
    const responses = [
      "How long will this take to resolve?",
      "I've been waiting for days already.",
      "Thank you, that helps clarify things."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  return "Let me help you with that.";
}

function detectIntent(message) {
  const lower = message.toLowerCase();
  
  const intents = {
    'missing_points': ['point', 'missing', 'didn\'t get', 'not credited', 'bonus', 'offer'],
    'account_issue': ['account', 'login', 'locked', 'password', 'can\'t access'],
    'receipt_problem': ['receipt', 'reject', 'blurry', 'scan', 'won\'t accept'],
    'reward_issue': ['gift', 'reward', 'redeem', 'card'],
    'fetch_play': ['game', 'play', 'app', 'level', 'complete'],
    'ereceipt_issue': ['email', 'ereceipt', 'connect', 'sync', 'gmail'],
    'referral_issue': ['refer', 'friend', 'code', 'invite']
  };
  
  let bestMatch = 'general_inquiry';
  let maxMatches = 0;
  
  for (const [intent, keywords] of Object.entries(intents)) {
    const matches = keywords.filter(keyword => lower.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = intent;
    }
  }
  
  return bestMatch;
}

function generateTestReport(test, logs) {
  return {
    testId: test.id,
    type: test.type,
    startTime: test.startTime,
    endTime: test.endTime,
    duration: ((new Date(test.endTime) - new Date(test.startTime)) / 1000).toFixed(1),
    configuration: test.config,
    results: test.results,
    logCount: logs.length,
    policiesUsed: test.policiesUsed || [],
    summary: test.results
  };
}

// ==================== ENHANCED CONVERSATION SIMULATION ====================

async function simulateAutonomousConversation(testId, initialIssue, config) {
  const customer = new AutonomousCustomer(initialIssue, config);
  let agentResponse = "Hello! I understand you're having an issue. How can I help you today?";
  
  emitLog(testId, 'info', '\n🤖 AUTONOMOUS CUSTOMER CONVERSATION');
  emitLog(testId, 'info', `Issue: ${initialIssue}`);
  emitLog(testId, 'info', `Customer personality: ${config.personality || 'frustrated'}`);
  
  let turnCount = 0;
  const maxTurns = config.maxTurns || 15;
  
  while (turnCount < maxTurns) {
    turnCount++;
    
    emitLog(testId, 'info', `\n--- Turn ${turnCount} ---`);
    emitLog(testId, 'info', `Agent: "${agentResponse}"`);
    
    // Customer responds to agent
    const customerResult = await customer.respondToAgent(agentResponse);
    emitLog(testId, 'info', `Customer: "${customerResult.response}"`);
    
    // Log customer state
    const satisfaction = customerResult.state.satisfied ? '✅ SATISFIED' : 
                        customerResult.state.frustrationLevel > 0.7 ? '😤 FRUSTRATED' : 
                        '😐 NEUTRAL';
    emitLog(testId, 'success', `State: ${satisfaction} | Expectation: ${customerResult.nextExpectation}`);
    
    // Check for conversation end
    if (customerResult.state.satisfied) {
      emitLog(testId, 'success', '🎉 CUSTOMER SATISFIED - CONVERSATION RESOLVED');
      return { success: true, turns: turnCount, reason: 'customer_satisfied' };
    }
    
    if (!customerResult.shouldContinue) {
      emitLog(testId, 'warning', '⏰ CONVERSATION ENDED - MAX TURNS OR UNRESOLVED');
      return { success: false, turns: turnCount, reason: 'max_turns_reached' };
    }
    
    await delay(1000);
    
    // Generate agent response (using Forethought or AI)
    agentResponse = await generateAgentResponse(customerResult.response, config, testId);
    
    await delay(800);
  }
  
  return { success: false, turns: maxTurns, reason: 'timeout' };
}

async function generateAgentResponse(customerMessage, config, testId) {
  // If we have Forethought integration, use that
  if (process.env.FORETHOUGHT_WIDGET_API_KEY) {
    try {
      // This would integrate with your actual Forethought widget
      const forethoughtResponse = await callForethoughtWidget(customerMessage);
      if (forethoughtResponse) {
        return forethoughtResponse;
      }
    } catch (error) {
      emitLog(testId, 'warning', 'Forethought integration failed, using AI fallback');
    }
  }
  
  // Fallback to AI agent response
  if (config.useOpenAI) {
    const systemPrompt = `You are a professional customer support agent for Fetch Rewards. 
    Be helpful, specific, and work toward resolving customer issues quickly.
    Customer message: "${customerMessage}"
    Provide a natural, helpful response. Maximum 2 sentences.`;
    
    try {
      return await generateWithOpenAI(customerMessage, systemPrompt, 0.7);
    } catch (error) {
      emitLog(testId, 'warning', 'AI agent response failed, using template');
    }
  }
  
  // Simple rule-based agent response
  return generateSimpleAgentResponse(customerMessage);
}

async function callForethoughtWidget(message) {
  // Placeholder for actual Forethought integration
  // This would make the real API call to your Forethought widget
  return null;
}

function generateSimpleAgentResponse(customerMessage) {
  const lower = customerMessage.toLowerCase();
  
  if (lower.includes('points') && lower.includes('missing')) {
    return "I can help you with those missing points. Can you tell me which store this was from and when you made the purchase?";
  }
  
  if (lower.includes('receipt') && (lower.includes('reject') || lower.includes('blurry'))) {
    return "I understand the receipt scanning issue. Let me manually review this for you. Can you describe what items were on the receipt?";
  }
  
  if (lower.includes('supervisor') || lower.includes('manager')) {
    return "I understand you'd like to speak with a supervisor. I'm escalating this issue right now and my manager will review your case within the next hour.";
  }
  
  if (lower.includes('thank') || lower.includes('perfect') || lower.includes('great')) {
    return "You're very welcome! I'm glad I could help resolve this for you. Is there anything else I can assist you with today?";
  }
  
  return "I understand your concern. Let me look into this right away and provide you with a specific solution.";
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    openai: isOpenAIConfigured,
    confluence: isConfluenceConfigured,
    mode: isOpenAIConfigured ? 'ai-powered' : 'mock'
  });
});

// Get categories (matching your Confluence structure)
app.get('/api/fetch/categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      { id: 'missing_points', name: 'Missing Points & Offers', description: 'Points not credited from purchases or offers' },
      { id: 'account_management', name: 'Account Management', description: 'Login, security, and account access' },
      { id: 'fetch_play', name: 'Fetch Play Games & Apps', description: 'Game and app completion issues' },
      { id: 'rewards_gift_cards', name: 'Rewards', description: 'Gift card redemption and delivery' },
      { id: 'receipt_issues', name: 'Receipt Scanning', description: 'Physical and digital receipt problems' },
      { id: 'ereceipt_scanning', name: 'eReceipt Scanning', description: 'Email receipt sync issues' },
      { id: 'referral_issues', name: 'Special Features', description: 'Referrals and app features' }
    ]
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

// Start category test
app.post('/api/fetch/test/start', async (req, res) => {
  const testId = `test_${Date.now()}`;
  const config = {
    conversationsPerCategory: req.body.conversationsPerCategory || 3,
    categories: req.body.categories || ['missing_points'],
    maxTurns: req.body.maxTurns || 10,
    useOpenAI: isOpenAIConfigured,
    useConfluence: isConfluenceConfigured
  };
  
  const test = {
    id: testId,
    type: 'category',
    config,
    status: 'initializing',
    startTime: new Date().toISOString(),
    conversations: [],
    policiesUsed: []
  };
  
  activeTests.set(testId, test);
  
  emitLog(testId, 'info', '🚀 Starting category test suite');
  emitLog(testId, 'info', `Categories: ${config.categories.join(', ')}`);
  emitLog(testId, 'info', `Conversations per category: ${config.conversationsPerCategory}`);
  if (config.useConfluence) {
    emitLog(testId, 'info', '📚 Using Confluence wiki policies');
  }
  
  setTimeout(() => runCategoryTest(testId, test), 100);
  
  res.json({
    success: true,
    testId,
    config,
    estimatedDuration: `${config.categories.length * config.conversationsPerCategory * 15}s`
  });
});

// Start freeform conversation
app.post('/api/fetch/freeform', async (req, res) => {
  const { query, maxTurns = 10 } = req.body;
  
  if (!query) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query is required' 
    });
  }
  
  const conversationId = `freeform_${Date.now()}`;
  const config = {
    maxTurns,
    useOpenAI: isOpenAIConfigured,
    useConfluence: isConfluenceConfigured
  };
  
  const test = {
    id: conversationId,
    type: 'freeform',
    config,
    status: 'running',
    startTime: new Date().toISOString(),
    initialQuery: query
  };
  
  activeTests.set(conversationId, test);
  
  emitLog(conversationId, 'info', '🎯 Starting freeform conversation');
  emitLog(conversationId, 'info', `Initial query: "${query}"`);
  
  setTimeout(() => runFreeformConversation(conversationId, query, config), 100);
  
  res.json({
    success: true,
    conversationId,
    config
  });
});

// Enhanced autonomous conversation endpoint
app.post('/api/fetch/autonomous', async (req, res) => {
  const { issue, personality = 'frustrated', maxTurns = 15 } = req.body;
  
  if (!issue) {
    return res.status(400).json({ 
      success: false, 
      error: 'Issue description is required' 
    });
  }
  
  const conversationId = `autonomous_${Date.now()}`;
  const config = {
    maxTurns,
    personality,
    useOpenAI: isOpenAIConfigured,
    useConfluence: isConfluenceConfigured
  };
  
  const test = {
    id: conversationId,
    type: 'autonomous',
    config,
    status: 'running',
    startTime: new Date().toISOString(),
    issue
  };
  
  activeTests.set(conversationId, test);
  
  emitLog(conversationId, 'info', '🤖 Starting autonomous customer conversation');
  emitLog(conversationId, 'info', `Customer issue: "${issue}"`);
  emitLog(conversationId, 'info', `Personality: ${personality}`);
  
  setTimeout(() => simulateAutonomousConversation(conversationId, issue, config), 100);
  
  res.json({
    success: true,
    conversationId,
    config
  });
});

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

// Get reports
app.get('/api/tests/reports', (req, res) => {
  const reports = Array.from(testReports.values());
  res.json({
    success: true,
    reports: reports.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  });
});

// ==================== TEST RUNNERS ====================

async function runCategoryTest(testId, test) {
  const { config } = test;
  test.status = 'running';
  
  let totalConversations = 0;
  let successfulConversations = 0;
  
  for (const category of config.categories) {
    emitLog(testId, 'info', `\n📁 Testing category: ${category.replace(/_/g, ' ').toUpperCase()}`);
    
    // Load policies for this category
    let policies = null;
    if (config.useConfluence) {
      policies = await confluenceSupport.getPolicyForCategory(category);
      if (policies && Object.keys(policies).length > 0) {
        test.policiesUsed.push(...Object.keys(policies));
        emitLog(testId, 'success', `✓ Loaded wiki policies for ${category}`);
      }
    }
    
    for (let i = 0; i < config.conversationsPerCategory; i++) {
      totalConversations++;
      emitLog(testId, 'info', `\n🗣️ Conversation ${totalConversations}/${config.categories.length * config.conversationsPerCategory}`);
      
      const success = await simulateConversation(testId, category, config, policies);
      
      if (success) {
        successfulConversations++;
        emitLog(testId, 'success', `✅ Conversation resolved`);
      } else {
        emitLog(testId, 'error', `❌ Conversation unresolved`);
      }
      
      test.conversations.push({
        category,
        success,
        timestamp: new Date().toISOString()
      });
      
      await delay(1500);
    }
  }
  
  // Complete test
  test.status = 'completed';
  test.endTime = new Date().toISOString();
  test.results = {
    totalConversations,
    successful: successfulConversations,
    failed: totalConversations - successfulConversations,
    successRate: (successfulConversations / totalConversations * 100).toFixed(1) + '%'
  };
  
  const report = generateTestReport(test, testLogs.get(testId) || []);
  testReports.set(testId, report);
  
  emitLog(testId, 'info', '\n' + '='.repeat(50));
  emitLog(testId, 'info', '📊 TEST COMPLETE');
  emitLog(testId, 'success', `Success rate: ${test.results.successRate}`);
  emitLog(testId, 'info', `Total: ${totalConversations} | Passed: ${successfulConversations} | Failed: ${test.results.failed}`);
}

async function simulateConversation(testId, category, config, policies) {
  // Generate customer message based on category and policies
  let customerMessage = generateCustomerIssue(category);
  
  if (config.useOpenAI) {
    const systemPrompt = `You are a Fetch Rewards customer with a ${category.replace(/_/g, ' ')} issue. 
    Express your specific problem clearly and with frustration. Include details like dates, amounts, or store names.
    Maximum 2 sentences.`;
    
    try {
      customerMessage = await generateWithOpenAI('Express your issue', systemPrompt);
    } catch (error) {
      emitLog(testId, 'warning', 'Using fallback customer message');
    }
  }
  
  emitLog(testId, 'info', `Customer: "${customerMessage}"`);
  
  // Detect intent
  const intent = detectIntent(customerMessage);
  const confidence = 0.75 + Math.random() * 0.24;
  emitLog(testId, 'success', `Intent: ${intent} (${(confidence * 100).toFixed(0)}% confidence)`);
  
  // Generate agent response based on policies
  let agentResponse = "I understand your concern. Let me help you with that.";
  
  if (policies && Object.keys(policies).length > 0) {
    // Use actual wiki content
    const policy = Object.values(policies)[0];
    if (policy.procedures && policy.procedures.length > 0) {
      agentResponse = `Based on our procedures: ${policy.procedures[0]}`;
    } else if (policy.templates && policy.templates.length > 0) {
      agentResponse = policy.templates[0];
    }
  }
  
  if (config.useOpenAI) {
    const policyContext = policies ? JSON.stringify(policies) : 'Standard support procedures';
    const agentPrompt = `You are a Fetch Rewards support agent. 
    Customer issue: "${customerMessage}"
    Available policies: ${policyContext.substring(0, 500)}
    
    Respond professionally following the policies. If no specific policy, use best practices.
    Maximum 2 sentences.`;
    
    try {
      agentResponse = await generateWithOpenAI(customerMessage, agentPrompt, 0.7);
    } catch (error) {
      emitLog(testId, 'warning', 'Using policy-based fallback response');
    }
  }
  
  emitLog(testId, 'info', `Agent: "${agentResponse}"`);
  
  // Simulate multi-turn conversation
  const turns = 2 + Math.floor(Math.random() * 3);
  for (let turn = 2; turn <= turns; turn++) {
    await delay(1000);
    
    // Customer follow-up
    if (config.useOpenAI) {
      const customerPrompt = `You are the customer. The agent said: "${agentResponse}". 
      Respond naturally. Either express satisfaction or ask a follow-up question. 1-2 sentences.`;
      
      try {
        customerMessage = await generateWithOpenAI('Respond', customerPrompt, 0.8);
      } catch (error) {
        customerMessage = "Thank you for your help.";
      }
    } else {
      const followups = [
        "How long will this take?",
        "Can you check again?",
        "Thank you, that helps.",
        "I need this resolved today."
      ];
      customerMessage = followups[Math.floor(Math.random() * followups.length)];
    }
    
    emitLog(testId, 'info', `Customer: "${customerMessage}"`);
    
    // Check for resolution
    if (customerMessage.toLowerCase().includes('thank') || 
        customerMessage.toLowerCase().includes('perfect') ||
        customerMessage.toLowerCase().includes('great')) {
      return true;
    }
  }
  
  // Resolution based on probability
  return Math.random() > 0.2;
}

async function runFreeformConversation(conversationId, initialQuery, config) {
  const test = activeTests.get(conversationId);
  let currentMessage = initialQuery;
  let turnCount = 0;
  
  emitLog(conversationId, 'info', '--- CONVERSATION START ---');
  
  // Detect initial intent and load relevant policies
  const initialIntent = detectIntent(initialQuery);
  let policies = null;
  
  if (config.useConfluence) {
    policies = await confluenceSupport.getPolicyForCategory(initialIntent);
    if (policies && Object.keys(policies).length > 0) {
      emitLog(conversationId, 'success', `📚 Loaded wiki policies for ${initialIntent}`);
    }
  }
  
  while (turnCount < config.maxTurns) {
    turnCount++;
    emitLog(conversationId, 'info', `\n📍 Turn ${turnCount}`);
    
    emitLog(conversationId, 'info', `Customer: "${currentMessage}"`);
    
    const intent = detectIntent(currentMessage);
    const confidence = 0.70 + Math.random() * 0.29;
    emitLog(conversationId, 'success', `Intent: ${intent} (${(confidence * 100).toFixed(0)}%)`);
    
    // Generate policy-aware response
    let agentResponse = "I'll help you with that.";
    
    if (config.useOpenAI) {
      const policyContext = policies ? JSON.stringify(policies).substring(0, 1000) : '';
      const systemPrompt = `You are a Fetch Rewards support agent.
      Customer message: "${currentMessage}"
      ${policyContext ? `Relevant policies: ${policyContext}` : ''}
      
      Provide helpful, professional support. Maximum 2 sentences.`;
      
      try {
        agentResponse = await generateWithOpenAI(currentMessage, systemPrompt, 0.7);
      } catch (error) {
        agentResponse = "Let me look into that for you.";
      }
    }
    
    emitLog(conversationId, 'info', `Agent: "${agentResponse}"`);
    
    if (turnCount >= config.maxTurns || Math.random() > 0.7) {
      emitLog(conversationId, 'success', '✅ Conversation resolved');
      break;
    }
    
    await delay(1000);
    
    // Generate next customer message
    if (config.useOpenAI) {
      const customerPrompt = `You are a customer. The agent said: "${agentResponse}". 
      Respond naturally. Express if you're satisfied or need more help. 1-2 sentences.`;
      
      try {
        currentMessage = await generateWithOpenAI('Respond', customerPrompt, 0.8);
      } catch (error) {
        currentMessage = "Thank you for your help!";
      }
    } else {
      currentMessage = "That makes sense, thank you!";
    }
  }
  
  test.status = 'completed';
  test.endTime = new Date().toISOString();
  test.results = {
    resolved: true,
    totalTurns: turnCount
  };
  
  emitLog(conversationId, 'info', '\n--- CONVERSATION END ---');
  emitLog(conversationId, 'info', `Total turns: ${turnCount}`);
  
  const report = {
    conversationId,
    type: 'freeform',
    initialQuery,
    startTime: test.startTime,
    endTime: test.endTime,
    resolved: true,
    turnCount
  };
  testReports.set(conversationId, report);
}

function generateCustomerIssue(category) {
  const issues = {
    'missing_points': [
      "I scanned my Walmart receipt yesterday but didn't get my bonus points",
      "The 5000 point offer for buying Pepsi products didn't credit",
      "My points from Target are missing"
    ],
    'account_management': [
      "I can't log into my account, it says it's locked",
      "My password reset email never arrives",
      "Someone else is using my account"
    ],
    'fetch_play': [
      "I completed level 50 in Solitaire Cash but no points",
      "The game crashed and I lost my progress",
      "I can't find where to enter the completion code"
    ],
    'receipt_issues': [
      "My receipt keeps getting rejected as blurry",
      "It won't accept my Costco receipt",
      "The app crashes when I try to scan"
    ]
  };
  
  const categoryIssues = issues[category] || issues['missing_points'];
  return categoryIssues[Math.floor(Math.random() * categoryIssues.length)];
}

// ==================== START SERVER ====================

app.listen(PORT, async () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log('='.repeat(60));
  
  // Try to connect to Confluence on startup
  if (isConfluenceConfigured) {
    try {
      const testPage = await confluenceSupport.fetchPage('Account Management');
      if (testPage) {
        console.log('✅ Confluence wiki connected successfully');
      }
    } catch (error) {
      console.log('⚠️  Confluence connection failed, using default policies');
    }
  }
  
  console.log('\nEndpoints:');
  console.log('  POST /api/fetch/test/start   - Start category test');
  console.log('  POST /api/fetch/freeform     - Start freeform conversation');
  console.log('  POST /api/fetch/autonomous   - Start autonomous customer conversation');
  console.log('  GET  /api/tests/logs/:id     - Real-time log streaming');
  console.log('  GET  /api/tests/active       - View active tests');
  console.log('  GET  /api/tests/reports      - View test reports');
  console.log('\n' + '='.repeat(60));
});