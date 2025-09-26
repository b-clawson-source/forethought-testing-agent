#!/usr/bin/env node

/**
 * Test script to verify the improved Forethought service
 * Run with: node scripts/testImprovedForethought.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testImprovedResponses() {
  console.log('🧪 Testing Improved Forethought Responses\n');

  const testCases = [
    {
      category: 'Missing Points',
      message: "I'm missing points from my receipt and need help getting them added to my account",
      expectedKeywords: ['receipt', 'points', 'store', 'date', 'amount']
    },
    {
      category: 'Receipt Issues', 
      message: "My receipt was rejected but I think it should have been accepted",
      expectedKeywords: ['receipt', 'clear', 'lighting', 'scan']
    },
    {
      category: 'Account Issues',
      message: "I forgot my password and can't log into my account",
      expectedKeywords: ['password', 'reset', 'login', 'email']
    },
    {
      category: 'Timeline Question',
      message: "How long will this take to resolve?",
      expectedKeywords: ['24-48 hours', 'business days', 'resolved']
    },
    {
      category: 'App Issues',
      message: "My app keeps crashing when I try to scan receipts",
      expectedKeywords: ['app', 'restart', 'update', 'close']
    }
  ];

  try {
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');

    console.log('2️⃣ Testing improved Forethought responses...\n');

    for (const testCase of testCases) {
      console.log(`📋 Testing: ${testCase.category}`);
      console.log(`👤 Customer: "${testCase.message}"`);

      try {
        // Test with your existing conversation endpoint
        const response = await axios.post(`${BASE_URL}/api/conversations/message`, {
          message: testCase.message,
          sessionId: 'test-session-' + Date.now()
        });

        const botResponse = response.data.response || response.data.message || 'No response';
        const intent = response.data.intent || 'unknown';
        const confidence = response.data.confidence || 0;

        console.log(`🤖 Agent: "${botResponse}"`);
        console.log(`📊 Intent: ${intent} (${confidence}% confidence)`);

        // Check if response contains expected keywords
        const hasExpectedContent = testCase.expectedKeywords.some(keyword => 
          botResponse.toLowerCase().includes(keyword.toLowerCase())
        );

        const isGeneric = botResponse === "Let me help you with that." || 
                         botResponse.length < 30;

        if (hasExpectedContent && !isGeneric) {
          console.log('✅ Response quality: GOOD (Specific and contextual)');
        } else if (!isGeneric) {
          console.log('⚠️ Response quality: FAIR (Not generic but could be more specific)');
        } else {
          console.log('❌ Response quality: POOR (Generic response)');
        }

        console.log('─'.repeat(60));

      } catch (error) {
        console.log(`❌ Error testing ${testCase.category}: ${error.message}`);
        console.log('─'.repeat(60));
      }
    }

    console.log('\n3️⃣ Testing autonomous conversation with improved responses...\n');

    // Start a small autonomous test
    const autonomousTest = await axios.post(`${BASE_URL}/api/autonomous-tests`, {
      initialPrompt: "I'm missing points from my receipt and need help getting them added",
      conversationCount: 2,
      maxTurns: 8
    });

    const testId = autonomousTest.data.testId;
    console.log(`🚀 Started autonomous test: ${testId}`);

    // Wait for completion
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      const statusResponse = await axios.get(`${BASE_URL}/api/autonomous-tests/${testId}`);
      const status = statusResponse.data.status;

      console.log(`   Status: ${status} (${attempts * 5}s elapsed)`);

      if (status === 'completed') {
        console.log('✅ Autonomous test completed!');
        
        const reportResponse = await axios.get(`${BASE_URL}/api/autonomous-tests/${testId}/report`);
        const report = reportResponse.data;

        console.log('\n📊 Results:');
        console.log(`   Success Rate: ${report.analysis?.summary?.successRate || '0'}%`);
        console.log(`   Total Conversations: ${report.report?.totalConversations || 0}`);
        
        // Show sample improved responses
        if (report.report?.conversationLogs?.[0]) {
          const log = report.report.conversationLogs[0];
          console.log('\n💬 Sample conversation with improved responses:');
          log.turns.slice(0, 4).forEach((turn, i) => {
            const speaker = turn.speaker === 'customer' ? '👤' : '🤖';
            console.log(`${speaker} ${turn.message.substring(0, 120)}${turn.message.length > 120 ? '...' : ''}`);
          });
        }
        
        break;
      } else if (status === 'failed') {
        console.log('❌ Autonomous test failed');
        break;
      }
    }

    console.log('\n🎉 Testing complete!');
    console.log('\n💡 If you see specific, contextual responses instead of generic ones,');
    console.log('   the improved Forethought service is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

// Test specific response categories
async function testResponseCategories() {
  console.log('\n🔍 Testing Response Categories...\n');

  const categories = [
    {
      name: 'Missing Points',
      messages: [
        "I didn't get points for my purchase",
        "My points are missing from yesterday's receipt",
        "Points not showing up for Target receipt"
      ]
    },
    {
      name: 'Receipt Issues',
      messages: [
        "My receipt was rejected",
        "Receipt scan not working",
        "Blurry receipt photo"
      ]
    },
    {
      name: 'Timeline Questions', 
      messages: [
        "How long does this take?",
        "When will I get my points?",
        "I've been waiting for days"
      ]
    }
  ];

  for (const category of categories) {
    console.log(`📂 Category: ${category.name}`);
    
    for (const message of category.messages) {
      try {
        const response = await axios.post(`${BASE_URL}/api/conversations/message`, {
          message,
          sessionId: 'category-test-' + Date.now()
        });

        const botResponse = response.data.response || 'No response';
        const isGeneric = botResponse === "Let me help you with that.";
        
        console.log(`   "${message}" → ${isGeneric ? '❌ Generic' : '✅ Contextual'}`);
        
      } catch (error) {
        console.log(`   "${message}" → ❌ Error`);
      }
    }
    console.log();
  }
}

async function main() {
  console.log('🚀 Testing Improved Forethought Integration\n');
  console.log('This will verify that responses are now contextual and specific\n');

  await testImprovedResponses();
  await testResponseCategories();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testImprovedResponses, testResponseCategories };