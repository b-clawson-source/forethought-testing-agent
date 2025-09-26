#!/usr/bin/env node

/**
 * Test script for the Autonomous Conversation System
 * Run with: node scripts/testAutonomous.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAutonomousSystem() {
  console.log('🧪 Testing Autonomous Conversation System\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');

    // Test 2: Start autonomous test
    console.log('\n2️⃣ Starting autonomous test...');
    const testRequest = {
      initialPrompt: "I'm missing points from my receipt and need help getting them added",
      conversationCount: 3, // Small number for testing
      maxTurns: 10
    };

    const startResponse = await axios.post(`${BASE_URL}/api/autonomous-tests`, testRequest);
    const testId = startResponse.data.testId;
    console.log(`✅ Test started with ID: ${testId}`);

    // Test 3: Monitor test progress
    console.log('\n3️⃣ Monitoring test progress...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/autonomous-tests/${testId}`);
        const status = statusResponse.data.status;

        console.log(`   Status: ${status} (${attempts * 10}s elapsed)`);

        if (status === 'completed') {
          completed = true;
          console.log('✅ Test completed successfully!');
          
          // Test 4: Get detailed report
          console.log('\n4️⃣ Fetching detailed report...');
          const reportResponse = await axios.get(`${BASE_URL}/api/autonomous-tests/${testId}/report`);
          const report = reportResponse.data;

          console.log('\n📊 Test Results:');
          console.log(`   Total Conversations: ${report.report.totalConversations}`);
          console.log(`   Successful: ${report.report.successfulConversations}`);
          console.log(`   Success Rate: ${report.analysis.summary.successRate}%`);
          console.log(`   Average Turns: ${report.analysis.summary.averageTurns}`);
          
          // Show sample conversation
          if (report.report.conversationLogs.length > 0) {
            const sampleLog = report.report.conversationLogs[0];
            console.log('\n📝 Sample Conversation:');
            console.log(`   Persona: ${sampleLog.persona}`);
            console.log(`   Resolved: ${sampleLog.resolved ? 'Yes' : 'No'}`);
            console.log(`   Turns: ${sampleLog.turns.length}`);
            
            sampleLog.turns.slice(0, 4).forEach((turn, index) => {
              const speaker = turn.speaker === 'customer' ? '👤' : '🤖';
              console.log(`   ${speaker} ${turn.speaker}: ${turn.message.substring(0, 100)}${turn.message.length > 100 ? '...' : ''}`);
            });
          }

          break;
        } else if (status === 'failed') {
          console.log('❌ Test failed');
          break;
        }
      } catch (error) {
        console.log(`   Error checking status: ${error.message}`);
      }
    }

    if (attempts >= maxAttempts && !completed) {
      console.log('⏰ Test monitoring timed out');
    }

    // Test 5: Get all tests
    console.log('\n5️⃣ Getting all tests...');
    const allTestsResponse = await axios.get(`${BASE_URL}/api/autonomous-tests`);
    console.log(`✅ Found ${allTestsResponse.data.tests.length} test(s)`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Test Forethought connectivity
async function testForethoughtConnectivity() {
  console.log('\n🔧 Testing Forethought connectivity...');
  
  try {
    // This would test your actual Forethought service
    const testMessage = "Hello, I need help with my account";
    console.log(`Sending test message: "${testMessage}"`);
    
    // You can add actual Forethought API test here
    console.log('✅ Forethought connectivity test would go here');
    
  } catch (error) {
    console.error('❌ Forethought connectivity test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Autonomous Conversation System Tests\n');
  console.log('Make sure your server is running on http://localhost:3001\n');

  await testForethoughtConnectivity();
  await testAutonomousSystem();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAutonomousSystem, testForethoughtConnectivity };