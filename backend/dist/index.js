"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root directory
const rootDir = path_1.default.join(__dirname, '../../');
const envPath = path_1.default.join(rootDir, '.env');
dotenv_1.default.config({ path: envPath });
// Import services AFTER loading environment
const databaseService_1 = require("./services/databaseService");
const simpleConversationEngine_1 = require("./services/simpleConversationEngine");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined'));
// Initialize services
const initializeServices = async () => {
    try {
        await databaseService_1.DatabaseService.initialize();
        console.log('✅ Database initialized');
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️  OpenAI API key not found');
            return;
        }
        // Initialize conversation engine
        simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        console.log('✅ Conversation engine initialized');
        console.log('✅ OpenAI API key loaded');
    }
    catch (error) {
        console.error('❌ Service initialization failed:', error);
    }
};
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'connected',
            llm: !!process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
            conversations: 'ready'
        }
    });
});
// Enhanced conversation endpoint
app.post('/api/conversations', async (req, res) => {
    try {
        const { initialPrompt, persona } = req.body;
        if (!initialPrompt || !persona) {
            return res.status(400).json({
                success: false,
                error: 'initialPrompt and persona are required',
                availablePersonas: ['frustrated_customer', 'neutral_customer', 'technical_user', 'non_technical_user']
            });
        }
        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API key not configured. Cannot generate AI conversations.'
            });
        }
        console.log(`🎭 Creating AI conversation: ${persona}`);
        console.log(`💬 Initial prompt: ${initialPrompt}`);
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const conversation = await conversationEngine.startConversation(initialPrompt, persona);
        res.status(201).json({
            success: true,
            data: {
                session: {
                    id: conversation.id,
                    initialPrompt: conversation.initialPrompt,
                    persona: conversation.persona,
                    status: conversation.status,
                    startTime: conversation.startTime,
                    messageCount: conversation.messages.length,
                    messages: conversation.messages,
                    lastMessage: conversation.messages[conversation.messages.length - 1]
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Error creating AI conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to generate AI-powered conversation'
        });
    }
});
// Get specific conversation
app.get('/api/conversations/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const conversation = conversationEngine.getConversation(sessionId);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        res.json({
            success: true,
            data: {
                session: {
                    ...conversation,
                    duration: Date.now() - conversation.startTime.getTime(),
                    messageCount: conversation.messages.length
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get all conversations
app.get('/api/conversations', (req, res) => {
    try {
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const conversations = conversationEngine.getAllConversations();
        const conversationSummaries = conversations.map(conv => ({
            id: conv.id,
            initialPrompt: conv.initialPrompt.substring(0, 100) + (conv.initialPrompt.length > 100 ? '...' : ''),
            persona: conv.persona,
            status: conv.status,
            startTime: conv.startTime,
            messageCount: conv.messages.length,
            duration: Date.now() - conv.startTime.getTime(),
            lastMessage: conv.messages[conv.messages.length - 1]?.content.substring(0, 80) + '...'
        }));
        res.json({
            success: true,
            data: {
                conversations: conversationSummaries,
                total: conversations.length,
                active: conversations.filter(c => c.status === 'active').length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get conversation messages
app.get('/api/conversations/:sessionId/messages', (req, res) => {
    try {
        const { sessionId } = req.params;
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const conversation = conversationEngine.getConversation(sessionId);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        res.json({
            success: true,
            data: {
                messages: conversation.messages,
                total: conversation.messages.length,
                sessionInfo: {
                    id: conversation.id,
                    persona: conversation.persona,
                    status: conversation.status
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Continue conversation (generate next turn)
app.post('/api/conversations/:sessionId/continue', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const updatedConversation = await conversationEngine.continueConversation(sessionId);
        if (!updatedConversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        res.json({
            success: true,
            data: {
                session: updatedConversation,
                newMessages: updatedConversation.messages.slice(-2) // Return last 2 messages (user + assistant)
            }
        });
    }
    catch (error) {
        console.error('❌ Error continuing conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Conversation statistics
app.get('/api/conversations/stats', (req, res) => {
    try {
        const conversationEngine = simpleConversationEngine_1.SimpleConversationEngine.getInstance();
        const conversations = conversationEngine.getAllConversations();
        const stats = {
            total: conversations.length,
            active: conversations.filter(c => c.status === 'active').length,
            completed: conversations.filter(c => c.status === 'completed').length,
            byPersona: conversations.reduce((acc, conv) => {
                acc[conv.persona] = (acc[conv.persona] || 0) + 1;
                return acc;
            }, {}),
            averageMessages: conversations.length > 0
                ? Math.round(conversations.reduce((sum, conv) => sum + conv.messages.length, 0) / conversations.length)
                : 0,
            averageDuration: conversations.length > 0
                ? Math.round(conversations.reduce((sum, conv) => sum + (Date.now() - conv.startTime.getTime()), 0) / conversations.length)
                : 0
        };
        res.json({
            success: true,
            data: { stats }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// LLM test endpoint
app.post('/api/llm/test', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.json({
                success: true,
                data: {
                    prompt: req.body.prompt || 'test',
                    response: 'Mock response - OpenAI API key not configured',
                    source: 'mock'
                }
            });
        }
        const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = req.body.prompt || 'Hello, this is a test message. Please respond briefly.';
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.7
        });
        res.json({
            success: true,
            data: {
                prompt,
                response: completion.choices[0]?.message?.content || 'No response',
                tokenUsage: completion.usage,
                model: 'gpt-4-turbo-preview'
            }
        });
    }
    catch (error) {
        console.error('LLM test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Available personas endpoint
app.get('/api/personas', (req, res) => {
    res.json({
        success: true,
        data: {
            personas: [
                {
                    type: 'frustrated_customer',
                    name: 'Frustrated Customer',
                    description: 'Impatient and upset, wants immediate resolution',
                    characteristics: ['Direct', 'Demanding', 'Shows frustration', 'Time-sensitive']
                },
                {
                    type: 'neutral_customer',
                    name: 'Neutral Customer',
                    description: 'Polite and professional, follows standard process',
                    characteristics: ['Courteous', 'Patient', 'Clear communication', 'Cooperative']
                },
                {
                    type: 'technical_user',
                    name: 'Technical User',
                    description: 'Technically savvy, uses technical terminology',
                    characteristics: ['Technical knowledge', 'Detailed descriptions', 'Has tried solutions', 'Precise']
                },
                {
                    type: 'non_technical_user',
                    name: 'Non-Technical User',
                    description: 'Limited technical knowledge, needs simple explanations',
                    characteristics: ['Needs simple terms', 'Confused by jargon', 'Step-by-step guidance', 'Basic user']
                }
            ]
        }
    });
});
// Start server
app.listen(port, async () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📋 Health: http://localhost:${port}/health`);
    console.log(`💬 Conversations: http://localhost:${port}/api/conversations`);
    console.log(`🎭 Personas: http://localhost:${port}/api/personas`);
    console.log(`🧪 LLM test: POST http://localhost:${port}/api/llm/test`);
    await initializeServices();
    console.log('\n🎉 Enhanced AI conversation system ready!');
    console.log('🎯 Try creating conversations with different personas:');
    console.log('   - frustrated_customer');
    console.log('   - neutral_customer');
    console.log('   - technical_user');
    console.log('   - non_technical_user');
});
exports.default = app;
