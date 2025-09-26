#!/usr/bin/env node

/**
 * Test script to verify the Forethought integration fix
 * Run with: node scripts/testRealForethoughtFix.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testRealForethoughtFix() {
  console.log('🔧 Testing Real Forethought Integration Fix\n');

  const testMessages = [
    {
      message: "Where are my points?",
      expectation: "Should ask for receipt details, not be generic"
    },
    {
      message: "I'm missing points from my receipt",
      expectation: "Should ask for store name, date, amount"
    },
    {
      message: "My receipt was rejected",
      expectation: "Should provide scanning tips"
    },
    {
      message: "How long will this take to resolve?",
      expectation: "Should give specific timeframe"
    },
    {
      message: "My app keeps crashing",
      expectation: "Should suggest app troubleshooting"
    }
  ];

  try {
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');

    console.log('2️⃣ Testing Forethought connectivity...');
    try {
      const connectivityResponse = await axios.get(`${BASE_URL}/api/conversations/test/forethought`);
      console.log('✅ Forethought connectivity test completed');
      console.log(`   Success: ${connectivityResponse.data.success}`);
      if (connectivityResponse.data.recommendations) {
        connectivityResponse.data.recommendations.forEach(rec => {
          console.log(`   💡 ${rec}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Forethought connectivity test failed, but continuing...');
    }

    console.log('\n3️⃣ Testing individual messages with REAL Forethought responses...\n');

    for (const testCase of testMessages) {
      console.log(`📋 Testing: "${testCase.message}"`);
      console.log(`📝 Expectation: ${testCase.expectation}`);
      
      try {
        const response = await axios.post(`${BASE_URL}/api/conversations/message`, {
          message: testCase.message,
          sessionId: `test-${Date.now()}`
        });

        const botResponse = response.data.response || response.data.message || 'No response';
        const intent = response.data.intent || 'unknown';
        const confidence = response.data.confidence || 0;

        console.log(`🤖 Agent Response: "${botResponse}"`);
        console.log(`🎯 Intent: ${intent} (${confidence}% confidence)`);

        // Check if response is generic
        const isGeneric = botResponse === "Let me help you with that." || 
                         botResponse === "Let me help you with that" ||
                         botResponse.length < 25;

        if (isGeneric) {
          console.log('❌ STILL GENERIC - Fix not working properly');
        } else {
          console.log('✅ SPECIFIC RESPONSE - Fix is working!');
          
          // Check for contextual content
          const hasContextualContent = 
            (testCase.message.includes('points') && botResponse.toLowerCase().includes('receipt')) ||
            (testCase.message.includes('receipt') && botResponse.toLowerCase().includes('scan')) ||
            (testCase.message.includes('long') && (botResponse.includes('24') || botResponse.includes('hour'))) ||
            (testCase.message.includes('app') && botResponse.toLowerCase().includes('restart'));
            
          if (hasContextualContent) {
            console.log('🎯 CONTEXTUALLY RELEVANT - Perfect!');
          }
        }

        console.log('─'.repeat(80));

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.response?.data) {
          console.log(`   Response: ${JSON.stringify(error.response.data)}`);
        }
        console.log('─'.repeat(80));
      }
    }

    console.log('\n4️⃣ Testing freeform autonomous conversation...\n');

    try {
      const freeformResponse = await axios.post(`${BASE_URL}/api/conversations/freeform`, {
        query: "I'm missing points from my Target receipt from yesterday",
        maxTurns: 6,
        persona: 'polite'
      });

      console.log('✅ Freeform conversation completed!');
      console.log(`   Conversation ID: ${freeformResponse.data.conversationId}`);
      console.log(`   Total Turns: ${freeformResponse.data.totalTurns}`);
      console.log(`   Resolved: ${freeformResponse.data.resolved ? 'YES' : 'NO'}`);

      // Show conversation sample
      if (freeformResponse.data.messages) {
        console.log('\n💬 Conversation Sample:');
        freeformResponse.data.messages.slice(0, 4).forEach((msg, i) => {
          const speaker = msg.role === 'user' ? '👤 Customer' : '🤖 Agent';
          const preview = msg.content.length > 100 ? 
            msg.content.substring(0, 100) + '...' : 
            msg.content;
          console.log(`   ${speaker}: ${preview}`);
          
          if (msg.metadata?.intent) {
            console.log(`      🎯 Intent: ${msg.metadata.intent} (${msg.metadata.confidence}%)`);
          }
        });
      }

    } catch (error) {
      console.log(`❌ Freeform conversation error: ${error.message}`);
    }

    console.log('\n🎉 Testing Complete!');
    console.log('\n📊 Summary:');
    console.log('   If you see specific, contextual responses instead of "Let me help you with that",');
    console.log('   then the Forethought integration fix is working correctly!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your existing conversation routes to use the fixed controller');
    console.log('   2. Test with your autonomous conversation system');
    console.log('   3. The responses should now feel like real customer support!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Main execution
if (require.main === module) {
  testRealForethoughtFix().catch(console.error);
}

module.exports = { testRealForethoughtFix };