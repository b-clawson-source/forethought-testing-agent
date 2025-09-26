// Script to discover and test Forethought widget endpoints
const axios = require('axios');

const API_KEY = 'f633608a-e999-442a-8f94-312ec5ff33ae';
const BASE_URL = 'https://solve-widget.forethought.ai';

// Possible endpoint variations
const endpoints = [
  // Standard patterns
  '/api/v1/chat/message',
  '/api/v1/messages',
  '/api/v1/chat',
  '/api/chat/message',
  '/api/messages',
  '/api/chat',
  
  // Widget specific
  '/widget/chat',
  '/widget/message',
  '/embed/chat',
  '/embed/message',
  
  // Simple patterns
  '/chat',
  '/message',
  '/messages',
  
  // Versioned
  '/v1/chat',
  '/v1/message',
  '/v1/messages',
  '/v2/chat',
  '/v2/messages',
  
  // Session-based
  '/api/session/message',
  '/api/conversations/messages',
  '/conversations/messages'
];

// Test message
const testMessage = "Hello, I need help with my account";

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\nTesting: ${url}`);
  
  // Try different request formats
  const requestVariations = [
    // Format 1: With api_key
    {
      message: testMessage,
      api_key: API_KEY,
      session_id: 'test-session-123'
    },
    // Format 2: With apiKey
    {
      message: testMessage,
      apiKey: API_KEY,
      sessionId: 'test-session-123'
    },
    // Format 3: With data-ft prefix
    {
      message: testMessage,
      'data-api-key': API_KEY,
      'data-ft-session-id': 'test-session-123'
    },
    // Format 4: In headers
    {
      message: testMessage,
      sessionId: 'test-session-123'
    }
  ];

  const headerVariations = [
    {
      'Content-Type': 'application/json'
    },
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    {
      'Content-Type': 'application/json',
      'api-key': API_KEY
    }
  ];

  for (let reqIdx = 0; reqIdx < requestVariations.length; reqIdx++) {
    const requestBody = requestVariations[reqIdx];
    
    for (let headerIdx = 0; headerIdx < headerVariations.length; headerIdx++) {
      const headers = headerVariations[headerIdx];
      
      try {
        const response = await axios.post(url, requestBody, {
          headers,
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500; // Accept any status code less than 500
          }
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log(`✅ SUCCESS! Endpoint: ${endpoint}`);
          console.log(`   Request format: #${reqIdx + 1}`);
          console.log(`   Header format: #${headerIdx + 1}`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
          return {
            success: true,
            endpoint,
            requestFormat: reqIdx,
            headerFormat: headerIdx,
            requestBody,
            headers,
            response: response.data
          };
        } else if (response.status === 401) {
          console.log(`🔑 Auth required for ${endpoint} (format ${reqIdx + 1}/${headerIdx + 1})`);
        } else if (response.status === 404) {
          // Silently skip 404s as they're expected
        } else {
          console.log(`❓ Status ${response.status} for ${endpoint} (format ${reqIdx + 1}/${headerIdx + 1})`);
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          console.log(`⏱️ Timeout for ${endpoint}`);
        } else if (error.response?.status !== 404) {
          console.log(`❌ Error for ${endpoint}:`, error.message);
        }
      }
    }
  }
  
  return { success: false, endpoint };
}

async function discoverEndpoints() {
  console.log('🔍 Discovering Forethought Widget Endpoints');
  console.log('=========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Testing ${endpoints.length} endpoints...`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log('\n🎉 Found working endpoint!');
      break;
    }
  }
  
  // Try to get widget configuration
  console.log('\n📋 Attempting to fetch widget configuration...');
  try {
    const configUrls = [
      `${BASE_URL}/api/widget/config`,
      `${BASE_URL}/widget/config`,
      `${BASE_URL}/config`,
      `${BASE_URL}/api/v1/widget/${API_KEY}/config`
    ];
    
    for (const url of configUrls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          },
          timeout: 3000
        });
        
        if (response.status === 200) {
          console.log(`✅ Found config at: ${url}`);
          console.log('Config:', JSON.stringify(response.data, null, 2).substring(0, 300));
        }
      } catch (e) {
        // Silent fail
      }
    }
  } catch (error) {
    console.log('No configuration endpoint found');
  }
  
  // Summary
  const successful = results.filter(r => r.success);
  console.log('\n========== SUMMARY ==========');
  if (successful.length > 0) {
    console.log(`✅ Found ${successful.length} working endpoint(s):`);
    successful.forEach(r => {
      console.log(`   - ${r.endpoint}`);
      console.log(`     Request format: #${r.requestFormat + 1}`);
      console.log(`     Header format: #${r.headerFormat + 1}`);
    });
    
    console.log('\n📝 Use this configuration:');
    const working = successful[0];
    console.log('Endpoint:', `${BASE_URL}${working.endpoint}`);
    console.log('Request Body:', JSON.stringify(working.requestBody, null, 2));
    console.log('Headers:', JSON.stringify(working.headers, null, 2));
  } else {
    console.log('❌ No working endpoints found');
    console.log('\nPossible issues:');
    console.log('1. The widget might require CORS headers or specific origin');
    console.log('2. The API key might need to be activated or configured');
    console.log('3. The widget might use WebSocket or SSE instead of REST');
    console.log('4. Try checking the browser Network tab when using the actual widget');
  }
}

// Run the discovery
discoverEndpoints().catch(console.error);