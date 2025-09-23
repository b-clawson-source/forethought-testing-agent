import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root directory
const rootDir = path.join(__dirname, '../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

// Import services AFTER loading environment
import { DatabaseService } from './services/databaseService';
import { SimpleConversationEngine } from './services/simpleConversationEngine';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Initialize services
const initializeServices = async () => {
  try {
    await DatabaseService.initialize();
    console.log('✅ Database initialized');
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  OpenAI API key not found');
      return;
    }
    
    // Initialize conversation engine
    SimpleConversationEngine.getInstance();
    console.log('✅ Conversation engine initialized');
    console.log('✅ OpenAI API key loaded');
    
  } catch (error) {
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

    const conversationEngine = SimpleConversationEngine.getInstance();
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

  } catch (error: any) {
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
    const conversationEngine = SimpleConversationEngine.getInstance();
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all conversations
app.get('/api/conversations', (req, res) => {
  try {
    const conversationEngine = SimpleConversationEngine.getInstance();
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
  } catch (error: any) {
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
    const conversationEngine = SimpleConversationEngine.getInstance();
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
  } catch (error: any) {
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
    const conversationEngine = SimpleConversationEngine.getInstance();
    
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
  } catch (error: any) {
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
    const conversationEngine = SimpleConversationEngine.getInstance();
    const conversations = conversationEngine.getAllConversations();

    const stats = {
      total: conversations.length,
      active: conversations.filter(c => c.status === 'active').length,
      completed: conversations.filter(c => c.status === 'completed').length,
      byPersona: conversations.reduce((acc, conv) => {
        acc[conv.persona] = (acc[conv.persona] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
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
  } catch (error: any) {
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
    
    const { OpenAI } = await import('openai');
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
  } catch (error: any) {
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

export default app;
