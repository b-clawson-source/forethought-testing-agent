# Quick Start Guide

Welcome to the Forethought Testing Agent! This guide will get you up and running in minutes.

## 🚀 Quick Setup (5 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- OpenAI API key
- Git (to clone the repository)

### 2. Clone and Setup
```bash
git clone <your-repo-url>
cd forethought-testing-agent

# Run the automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Configure Environment
Edit the `.env` file with your API keys:
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for Forethought integration)
FORETHOUGHT_API_KEY=your_forethought_api_key_here
FORETHOUGHT_WIDGET_URL=your_widget_url_here
FORETHOUGHT_WORKSPACE_ID=your_workspace_id_here
```

### 4. Start the Server
```bash
npm run dev
```

The backend API will be available at `http://localhost:3001`

## 🎯 First Test (2 minutes)

### Test the API
```bash
# Health check
curl http://localhost:3001/health

# Test LLM integration
curl -X POST http://localhost:3001/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, this is a test message"}'
```

### Start Your First Conversation
```bash
curl -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "initialPrompt": "I need help with my billing",
    "persona": "neutral_customer"
  }'
```

## 📊 Dashboard Overview

Once running, you can access these endpoints:

### Core API Endpoints
- **Health Check**: `GET /health`
- **Conversations**: `GET /api/conversations`
- **Start Conversation**: `POST /api/conversations`
- **LLM Testing**: `POST /api/llm/test`
- **Policy Validation**: `POST /api/policies/validate`
- **Test Scenarios**: `GET /api/test-scenarios`

### Key Features Available
- ✅ **LLM-guided conversations** with OpenAI GPT-4
- ✅ **Real-time conversation analysis**
- ✅ **Policy compliance checking**
- ✅ **Multiple persona testing**
- ✅ **Conversation export (JSON/CSV)**
- ✅ **WebSocket real-time updates**
- ✅ **Comprehensive logging**

## 🔧 Configuration

### Personas Available
- `neutral_customer` - Balanced, professional
- `frustrated_customer` - Impatient, demanding
- `technical_user` - Technically savvy
- `non_technical_user` - Needs simple explanations
- `impatient_user` - Wants quick resolution
- `detail_oriented_user` - Wants comprehensive info

### Sample Scenarios
The system comes with pre-built scenarios for:
- Billing issues (disputes, payments, plan changes)
- Technical support (login problems, API issues, performance)
- Account management (password resets, security concerns)

### Policy Rules
Default policy validation includes:
- No requests for sensitive personal information
- Professional tone maintenance
- Intent confidence thresholds
- Response time limits

## 🧪 Testing Workflows

### 1. Simple Conversation Test
```bash
# Start a conversation
CONVERSATION_ID=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"initialPrompt": "I have a billing question", "persona": "neutral_customer"}' \
  | jq -r '.data.session.id')

# Check conversation status
curl http://localhost:3001/api/conversations/$CONVERSATION_ID

# Get conversation analysis
curl http://localhost:3001/api/conversations/$CONVERSATION_ID/analysis
```

### 2. Policy Validation Test
```bash
curl -X POST http://localhost:3001/api/policies/validate \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "id": "test_123",
      "role": "assistant", 
      "content": "Can you please provide your social security number?",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }
  }'
```

### 3. Run Test Scenario
```bash
# Create a test scenario
curl -X POST http://localhost:3001/api/test-scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basic Billing Test",
    "description": "Test basic billing inquiry handling",
    "template": {
      "name": "Billing Inquiry",
      "description": "Customer asks about billing",
      "category": "billing",
      "initialPrompt": "I have a question about my recent bill",
      "recommendedPersona": "neutral_customer",
      "expectedIntents": ["billing_inquiry"],
      "expectedActions": ["retrieve_billing_info"]
    }
  }'

# Run the scenario (use the ID returned from creation)
curl -X POST http://localhost:3001/api/test-scenarios/run \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "YOUR_SCENARIO_ID"}'
```

## 📁 Project Structure

```
forethought-testing-agent/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Core business logic
│   │   ├── middleware/      # Express middleware
│   │   └── routes/          # API routes
├── shared/                  # Shared TypeScript types
├── policies/                # Support wiki content
│   └── wiki-content/        # Markdown policy files
├── conversation-templates/   # Test templates
│   ├── persona-profiles/    # Customer personas
│   ├── initial-prompts/     # Conversation starters
│   └── scenario-templates/  # Test scenarios
├── test-scenarios/          # Saved test cases
├── data/                    # SQLite database
└── logs/                    # Application logs
```

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Real-time logs
tail -f logs/app.log

# Error logs only
tail -f logs/error.log
```

### Check System Status
```bash
# API health
curl http://localhost:3001/health

# LLM service status
curl http://localhost:3001/api/llm/health

# Get metrics
curl http://localhost:3001/api/llm/metrics
```

### Database Inspection
The SQLite database is stored in `data/testing-agent.db`. You can inspect it using:
```bash
sqlite3 data/testing-agent.db
```

Common queries:
```sql
-- View all conversations
SELECT id, persona, status, start_time FROM conversation_sessions;

-- View conversation messages
SELECT role, content, timestamp FROM conversation_messages WHERE session_id = 'YOUR_SESSION_ID';

-- View policy rules
SELECT name, severity, enabled FROM policy_rules;
```

## 🎨 Customization

### Add Custom Personas
Edit `conversation-templates/persona-profiles/personas.json`:
```json
{
  "type": "custom_persona",
  "name": "Your Custom Persona",
  "description": "Description of behavior",
  "characteristics": ["trait1", "trait2"],
  "communicationStyle": "How they communicate",
  "commonPhrases": ["phrase1", "phrase2"],
  "escalationTriggers": ["trigger1", "trigger2"]
}
```

### Add Policy Rules
```bash
curl -X POST http://localhost:3001/api/policies/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Policy Rule",
    "description": "Description of the rule",
    "ruleType": "content",
    "conditions": [{
      "field": "content",
      "operator": "not_contains", 
      "value": ["forbidden_word"],
      "caseSensitive": false
    }],
    "severity": "high"
  }'
```

### Add Wiki Content
1. Create markdown files in `policies/wiki-content/`
2. Refresh the wiki content:
```bash
curl -X POST http://localhost:3001/api/policies/wiki/refresh
```

## 🚨 Troubleshooting

### Common Issues

**1. "OpenAI API key not configured"**
- Ensure `OPENAI_API_KEY` is set in your `.env` file
- Test with: `curl http://localhost:3001/api/llm/health`

**2. "Database not found"**
- The database is created automatically on first run
- Check the `data/` directory exists and is writable

**3. "Rate limit exceeded"**
- The system has built-in rate limiting
- Wait a moment or adjust rate limits in the code

**4. "Conversation stuck in 'active' status"**
- Conversations timeout after 5 minutes by default
- You can manually end them: `POST /api/conversations/{id}/end`

### Getting Help

1. **Check the logs**: `tail -f logs/app.log`
2. **Verify API health**: `curl http://localhost:3001/health`
3. **Test LLM connectivity**: `curl -X POST http://localhost:3001/api/llm/test`
4. **Review configuration**: Check your `.env` file

## 🎯 Next Steps

1. **Add your support content** to `policies/wiki-content/`
2. **Customize personas** for your specific use cases
3. **Create test scenarios** for your common support flows
4. **Set up CI/CD integration** for automated testing
5. **Build the frontend interface** for easier testing

## 📚 API Documentation

For detailed API documentation, see:
- [API Reference](./API_REFERENCE.md)
- [Policy Management](./POLICY_GUIDE.md)
- [Conversation Testing](./TESTING_GUIDE.md)

---

**Ready to test your Forethought integration? Start with a simple conversation and watch the AI-powered testing in action!** 🚀