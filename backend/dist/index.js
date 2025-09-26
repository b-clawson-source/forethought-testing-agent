"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
// Existing routes
const tests_1 = __importDefault(require("./routes/tests"));
const conversations_1 = __importDefault(require("./routes/conversations")); // keep your existing basic engine
// NEW: Add autonomous testing routes
const autonomousTests_1 = require("./routes/autonomousTests");
const app = (0, express_1.default)();
// --- middleware ---
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // Increased from 1mb for larger test data
app.use((0, morgan_1.default)('dev'));
// --- simple health/debug ---
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        ts: new Date().toISOString(),
        hasWidgetKey: !!process.env.FORETHOUGHT_WIDGET_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY, // NEW: Check OpenAI key
        autonomousTestingEnabled: !!(process.env.OPENAI_API_KEY && process.env.FORETHOUGHT_WIDGET_API_KEY)
    });
});
// (optional) quick debug endpoint to verify env + mode
app.get('/api/debug/mode', (_req, res) => {
    res.json({
        mode: process.env.FORETHOUGHT_MODE ?? 'widget',
        hasWidgetKey: !!process.env.FORETHOUGHT_WIDGET_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY, // NEW: OpenAI status
        replyTimeoutMs: Number(process.env.FT_REPLY_TIMEOUT_MS ?? 9000),
        headless: String(process.env.PLAYWRIGHT_HEADLESS ?? 'true'),
        // NEW: Autonomous testing configuration
        autonomousConfig: {
            enabled: !!(process.env.OPENAI_API_KEY && process.env.FORETHOUGHT_WIDGET_API_KEY),
            maxConversations: Number(process.env.MAX_AUTONOMOUS_CONVERSATIONS ?? 50),
            maxTurns: Number(process.env.MAX_CONVERSATION_TURNS ?? 30),
            openAIModel: process.env.OPENAI_MODEL ?? 'gpt-4'
        }
    });
});
// NEW: Autonomous testing status endpoint
app.get('/api/debug/autonomous', (_req, res) => {
    const openAIKey = process.env.OPENAI_API_KEY;
    const forethoughtKey = process.env.FORETHOUGHT_WIDGET_API_KEY;
    res.json({
        status: 'autonomous testing system',
        ready: !!(openAIKey && forethoughtKey),
        components: {
            openai: {
                configured: !!openAIKey,
                keyLength: openAIKey ? openAIKey.length : 0,
                model: process.env.OPENAI_MODEL ?? 'gpt-4'
            },
            forethought: {
                configured: !!forethoughtKey,
                keyLength: forethoughtKey ? forethoughtKey.length : 0,
                baseUrl: 'https://solve-widget.forethought.ai'
            }
        },
        features: {
            conversationGeneration: !!openAIKey,
            forethoughtIntegration: !!forethoughtKey,
            autonomousTesting: !!(openAIKey && forethoughtKey),
            reportGeneration: true
        }
    });
});
// --- mount routers --- (FIXED ORDER)
// basic "toy" conversation engine (what you saw earlier in logs)
app.use('/api/conversations', conversations_1.default);
// **Autonomous Forethought runner (Playwright/widget-backed)**
app.use('/api/tests', tests_1.default);
// NEW: **Autonomous Conversation Testing System (OpenAI + Forethought)**
app.use('/api/autonomous-tests', autonomousTests_1.autonomousTestRoutes);
// NEW: Error handling middleware for autonomous testing
app.use((err, req, res, next) => {
    if (req.path.startsWith('/api/autonomous-tests')) {
        console.error('Autonomous testing error:', err);
        res.status(500).json({
            error: 'Autonomous testing system error',
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
    else {
        next(err);
    }
});
// --- startup ---
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📋 Health: http://localhost:${port}/health`);
    // Debug: Show what routes are mounted
    console.log(`\n📝 MOUNTED ROUTES:`);
    console.log(`   /api/conversations -> conversationsRoutes`);
    console.log(`   /api/tests -> testsRoutes`);
    console.log(`   /api/autonomous-tests -> autonomousTestRoutes`);
    // Existing endpoints
    console.log(`\n🧪 EXISTING ENDPOINTS:`);
    console.log(`🧪 Tests API (autonomous): POST http://localhost:${port}/api/tests/run-once`);
    console.log(`🧪 Tests API (cycle):      POST http://localhost:${port}/api/tests/start`);
    // NEW: Conversation endpoints  
    console.log(`\n💬 CONVERSATION ENDPOINTS:`);
    console.log(`📨 Send Message: POST http://localhost:${port}/api/conversations/message`);
    console.log(`🤖 Freeform Chat: POST http://localhost:${port}/api/conversations/freeform`);
    console.log(`🔧 Test Forethought: GET http://localhost:${port}/api/conversations/test/forethought`);
    // NEW: Autonomous testing endpoints
    console.log(`\n🤖 AUTONOMOUS CONVERSATION TESTING:`);
    console.log(`🚀 Start Test: POST http://localhost:${port}/api/autonomous-tests`);
    console.log(`📊 Get Results: GET http://localhost:${port}/api/autonomous-tests/{testId}`);
    console.log(`📝 Get Logs: GET http://localhost:${port}/api/autonomous-tests/{testId}/logs`);
    console.log(`📈 Get Report: GET http://localhost:${port}/api/autonomous-tests/{testId}/report`);
    console.log(`\n🔎 DEBUG ENDPOINTS:`);
    console.log(`🔎 Debug Mode: GET http://localhost:${port}/api/debug/mode`);
    console.log(`🔧 Autonomous Status: GET http://localhost:${port}/api/debug/autonomous`);
    // Check configuration
    const openAIConfigured = !!process.env.OPENAI_API_KEY;
    const forethoughtConfigured = !!process.env.FORETHOUGHT_WIDGET_API_KEY;
    console.log(`\n🔧 CONFIGURATION STATUS:`);
    console.log(`   OpenAI API: ${openAIConfigured ? '✅ Configured' : '❌ Missing OPENAI_API_KEY'}`);
    console.log(`   Forethought: ${forethoughtConfigured ? '✅ Configured' : '❌ Missing FORETHOUGHT_WIDGET_API_KEY'}`);
    console.log(`   Autonomous Testing: ${openAIConfigured && forethoughtConfigured ? '✅ Ready' : '❌ Needs both API keys'}`);
    if (!openAIConfigured) {
        console.log(`\n⚠️  Add OPENAI_API_KEY to your .env file to enable autonomous testing`);
    }
    if (openAIConfigured && forethoughtConfigured) {
        console.log(`\n🎉 Autonomous Conversation Testing System Ready!`);
        console.log(`\n📝 TEST THE CONVERSATION ENDPOINT:`);
        console.log(`   curl -X POST http://localhost:${port}/api/conversations/message \\`);
        console.log(`        -H "Content-Type: application/json" \\`);
        console.log(`        -d '{"message":"Where are my points?","sessionId":"test"}'`);
    }
});
//# sourceMappingURL=index.js.map