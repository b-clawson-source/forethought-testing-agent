import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llmService';
import { DatabaseService } from './databaseService';
import { ForethoughtService } from './forethoughtService';
import {
  ConversationSession,
  ConversationMessage,
  ConversationConfig,
  // ConversationAnalysis,   // <- remove
  PersonaType,
  ConversationStatus,
  // AnalysisIssue           // <- remove
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
      maxTurns: parseInt(process.env.MAX_CONVERSATION_TURNS ?? '6', 10),
      timeoutMs: parseInt(process.env.CONVERSATION_TIMEOUT_MS ?? '300000', 10),
      llmModel: process.env.OPENAI_MODEL ?? 'gpt-4-turbo-preview',
      temperature: Number(process.env.OPENAI_TEMPERATURE ?? '0.7'),
      enablePolicyValidation: true,
      enableIntentTracking: true,
      enableActionValidation: true,
      ...config
    };

    const session: ConversationSession = {
      id: sessionId,
      initialPrompt,
      persona,
      // If enum:
      // status: ConversationStatus.Pending,
      status: 'pending' as ConversationStatus,
      messages: [],
      startTime: new Date(),
      configuration: fullConfig
    };

    await this.saveSession(session);
    this.activeSessions.set(sessionId, session);

    console.log(`Started conversation ${sessionId} with persona: ${persona}`);

    const t = setTimeout(() => this.generateInitialUserMessage(session), 500);
    if ('unref' in t && typeof t.unref === 'function') t.unref();

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
      const llmResponse = await this.llmService.generateConversationResponse(
        [],
        context,
        {
          temperature: session.configuration.temperature,
          model: session.configuration.llmModel
        }
      );

      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: llmResponse.message.content,
        timestamp: new Date(),
        metadata: { processingTime: llmResponse.processingTime }
      };

      session.messages.push(userMessage);
      // If enum:
      // session.status = ConversationStatus.Active;
      session.status = 'active' as ConversationStatus;
      await this.saveMessage(session.id, userMessage);
      await this.updateSessionStatus(session.id, session.status);

      console.log(`Generated initial message for ${session.id}: ${userMessage.content.substring(0, 50)}...`);

      const t = setTimeout(() => this.processNextTurn(session.id), 1000);
      if ('unref' in t && typeof t.unref === 'function') t.unref();

    } catch (error: unknown) {
      console.error('Failed to generate initial user message:', error);
      // If enum:
      // session.status = ConversationStatus.Failed;
      session.status = 'failed' as ConversationStatus;
      await this.updateSessionStatus(session.id, session.status);
    }
  }

  private async processNextTurn(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== ('active' as ConversationStatus)) return;

    try {
      const lastMessage = session.messages[session.messages.length - 1];

      if (lastMessage.role === 'user') {
        const forethoughtResponse = await this.forethoughtService.processMessage(
          lastMessage.content,
          sessionId
        );

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

        if (session.messages.length < session.configuration.maxTurns) {
          const t = setTimeout(() => this.generateNextUserMessage(session), 2000);
          if ('unref' in t && typeof t.unref === 'function') t.unref();
        } else {
          await this.endConversation(sessionId);
        }
      }
    } catch (error: unknown) {
      console.error(`Error processing turn for ${sessionId}:`, error);
      await this.endConversation(sessionId);
    }
  }

  // ... (rest unchanged except applying the same patterns for catch: unknown, timers, and enum-safe statuses)

  public async getAllSessions(limit = 20): Promise<ConversationSession[]> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();

      // Prefer start_time if created_at isn't guaranteed:
      const sessionRows = await db.all(
        `
        SELECT * FROM conversation_sessions 
        ORDER BY start_time DESC 
        LIMIT ?
        `,
        [limit]
      );

      return sessionRows.map((row: any) => ({
        id: row.id,
        initialPrompt: row.initial_prompt,
        persona: row.persona as PersonaType,
        status: row.status as ConversationStatus,
        messages: [],
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        configuration: JSON.parse(row.configuration),
        analysis: row.analysis ? JSON.parse(row.analysis) : undefined
      }));
    } catch (error: unknown) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }
}