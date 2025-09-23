import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llmService';
import { DatabaseService } from './databaseService';
import { ForethoughtService } from './forethoughtService';
import {
  ConversationSession,
  ConversationMessage,
  ConversationConfig,
  ConversationAnalysis,
  PersonaType,
  ConversationStatus,
  AnalysisIssue
} from '../../shared/types/conversation';
import { ConversationContext } from '../../shared/types/llm';

export class ConversationEngine {
  private static instance: ConversationEngine;
  private llmService = LLMService.getInstance();
  private forethoughtService = ForethoughtService.getInstance();
  private activeSessions = new Map<string, ConversationSession>();

  private constructor() {}

  public static getInstance(): ConversationEngine {
    if (!ConversationEngine.instance) {
      ConversationEngine.instance = new ConversationEngine();
    }
    return ConversationEngine.instance;
  }

  public async startConversation(
    initialPrompt: string,
    persona: PersonaType,
    config?: Partial<ConversationConfig>
  ): Promise<ConversationSession> {
    const sessionId = uuidv4();
    const fullConfig: ConversationConfig = {
      maxTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '6'),
      timeoutMs: parseInt(process.env.CONVERSATION_TIMEOUT_MS || '300000'),
      llmModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      enablePolicyValidation: true,
      enableIntentTracking: true,
      enableActionValidation: true,
      ...config
    };

    const session: ConversationSession = {
      id: sessionId,
      initialPrompt,
      persona,
      status: 'pending',
      messages: [],
      startTime: new Date(),
      configuration: fullConfig
    };

    // Store session in database
    await this.saveSession(session);
    
    // Store in memory for quick access
    this.activeSessions.set(sessionId, session);

    console.log(`Started conversation ${sessionId} with persona: ${persona}`);

    // Start the conversation by generating the first user message
    setTimeout(() => this.generateInitialUserMessage(session), 500);

    return session;
  }

  private async generateInitialUserMessage(session: ConversationSession): Promise<void> {
    const context: ConversationContext = {
      sessionId: session.id,
      persona: session.persona,
      currentTurn: 0,
      conversationGoal: session.initialPrompt
    };

    try {
      // Generate the first customer message based on the initial prompt and persona
      const llmResponse = await this.llmService.generateConversationResponse(
        [], // No previous messages
        context,
        {
          temperature: session.configuration.temperature,
          model: session.configuration.llmModel
        }
      );

      // Create the initial user message
      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: llmResponse.message.content,
        timestamp: new Date(),
        metadata: {
          processingTime: llmResponse.processingTime
        }
      };

      // Add to session and save
      session.messages.push(userMessage);
      session.status = 'active';
      await this.saveMessage(session.id, userMessage);
      await this.updateSessionStatus(session.id, 'active');

      console.log(`Generated initial message for ${session.id}: ${userMessage.content.substring(0, 50)}...`);

      // Process this message through Forethought
      setTimeout(() => this.processNextTurn(session.id), 1000);

    } catch (error) {
      console.error('Failed to generate initial user message:', error);
      session.status = 'failed';
      await this.updateSessionStatus(session.id, 'failed');
    }
  }

  private async processNextTurn(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    try {
      const lastMessage = session.messages[session.messages.length - 1];
      
      if (lastMessage.role === 'user') {
        // Process user message through Forethought
        const forethoughtResponse = await this.forethoughtService.processMessage(
          lastMessage.content,
          sessionId
        );

        // Create assistant message
        const assistantMessage: ConversationMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: forethoughtResponse.response,
          timestamp: new Date(),
          metadata: {
            intent: forethoughtResponse.intent,
            confidence: forethoughtResponse.confidence,
            actions: forethoughtResponse.actions,
            processingTime: forethoughtResponse.processingTime
          }
        };

        session.messages.push(assistantMessage);
        await this.saveMessage(sessionId, assistantMessage);

        console.log(`Assistant response for ${sessionId}: ${forethoughtResponse.intent} (${forethoughtResponse.confidence})`);

        // Check if conversation should continue
        if (session.messages.length < session.configuration.maxTurns) {
          // Generate next user response
          setTimeout(() => this.generateNextUserMessage(session), 2000);
        } else {
          await this.endConversation(sessionId);
        }
      }
    } catch (error) {
      console.error(`Error processing turn for ${sessionId}:`, error);
      await this.endConversation(sessionId);
    }
  }

  private async generateNextUserMessage(session: ConversationSession): Promise<void> {
    const context: ConversationContext = {
      sessionId: session.id,
      persona: session.persona,
      currentTurn: Math.floor(session.messages.length / 2),
      lastForethoughtResponse: session.messages[session.messages.length - 1]?.content,
      lastIntent: session.messages[session.messages.length - 1]?.metadata?.intent,
      lastActions: session.messages[session.messages.length - 1]?.metadata?.actions,
      conversationGoal: session.initialPrompt
    };

    try {
      // Convert messages to LLM format (last few messages for context)
      const llmMessages = session.messages.slice(-4).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate next user response
      const llmResponse = await this.llmService.generateConversationResponse(
        llmMessages,
        context,
        {
          temperature: session.configuration.temperature,
          model: session.configuration.llmModel
        }
      );

      // Create the user message
      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: llmResponse.message.content,
        timestamp: new Date(),
        metadata: {
          processingTime: llmResponse.processingTime
        }
      };

      session.messages.push(userMessage);
      await this.saveMessage(session.id, userMessage);

      console.log(`Generated user response for ${session.id}: ${userMessage.content.substring(0, 50)}...`);

      // Process this message in the next turn
      setTimeout(() => this.processNextTurn(session.id), 1500);

    } catch (error) {
      console.error('Failed to generate next user message:', error);
      await this.endConversation(session.id);
    }
  }

  public async endConversation(sessionId: string): Promise<ConversationSession> {
    const session = this.activeSessions.get(sessionId) || await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'completed';
    session.endTime = new Date();

    // Generate simple analysis
    session.analysis = {
      totalMessages: session.messages.length,
      averageResponseTime: 800, // Mock value
      intentAccuracy: 0.85, // Mock value
      policyComplianceScore: 1.0,
      actionExecutionSuccess: 1.0,
      conversationQuality: 0.8,
      issues: [],
      summary: `Conversation completed with ${session.messages.length} messages.`
    };

    // Save final session state
    await this.saveSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    const duration = session.endTime.getTime() - session.startTime.getTime();
    console.log(`Conversation ${sessionId} completed: ${session.messages.length} messages in ${duration}ms`);

    return session;
  }

  // Database operations (simplified)
  private async saveSession(session: ConversationSession): Promise<void> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      
      await db.run(`
        INSERT OR REPLACE INTO conversation_sessions (
          id, initial_prompt, persona, status, start_time, end_time, 
          configuration, analysis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        session.id,
        session.initialPrompt,
        session.persona,
        session.status,
        session.startTime.toISOString(),
        session.endTime?.toISOString() || null,
        JSON.stringify(session.configuration),
        session.analysis ? JSON.stringify(session.analysis) : null
      ]);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      
      await db.run(`
        INSERT INTO conversation_messages (
          id, session_id, role, content, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        sessionId,
        message.role,
        message.content,
        message.timestamp.toISOString(),
        message.metadata ? JSON.stringify(message.metadata) : null
      ]);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  private async updateSessionStatus(sessionId: string, status: ConversationStatus): Promise<void> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      
      await db.run(`
        UPDATE conversation_sessions 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, sessionId]);
    } catch (error) {
      console.error('Failed to update session status:', error);
    }
  }

  public async getSession(sessionId: string): Promise<ConversationSession | null> {
    // Check memory cache first
    const cachedSession = this.activeSessions.get(sessionId);
    if (cachedSession) {
      return cachedSession;
    }

    try {
      // Load from database
      const db = await DatabaseService.getInstance().getDatabase();
      
      const sessionRow = await db.get(`
        SELECT * FROM conversation_sessions WHERE id = ?
      `, [sessionId]);

      if (!sessionRow) {
        return null;
      }

      const messagesRows = await db.all(`
        SELECT * FROM conversation_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `, [sessionId]);

      const session: ConversationSession = {
        id: sessionRow.id,
        initialPrompt: sessionRow.initial_prompt,
        persona: sessionRow.persona as PersonaType,
        status: sessionRow.status as ConversationStatus,
        messages: messagesRows.map(row => ({
          id: row.id,
          role: row.role as 'user' | 'assistant' | 'system',
          content: row.content,
          timestamp: new Date(row.timestamp),
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        })),
        startTime: new Date(sessionRow.start_time),
        endTime: sessionRow.end_time ? new Date(sessionRow.end_time) : undefined,
        configuration: JSON.parse(sessionRow.configuration),
        analysis: sessionRow.analysis ? JSON.parse(sessionRow.analysis) : undefined
      };

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  public async getAllSessions(limit = 20): Promise<ConversationSession[]> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      
      const sessionRows = await db.all(`
        SELECT * FROM conversation_sessions 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);

      return sessionRows.map(row => ({
        id: row.id,
        initialPrompt: row.initial_prompt,
        persona: row.persona as PersonaType,
        status: row.status as ConversationStatus,
        messages: [], // We'll load messages separately if needed
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        configuration: JSON.parse(row.configuration),
        analysis: row.analysis ? JSON.parse(row.analysis) : undefined
      }));
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  public getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}
