import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llmService';
import { DatabaseService } from './databaseService';
import { LoggerService } from './loggerService';
import { ForethoughtService } from './forethoughtService';
import { PolicyService } from './policyService';
import { WebSocketService } from './webSocketService';
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
  private logger = LoggerService.getInstance();
  private forethoughtService = ForethoughtService.getInstance();
  private policyService = PolicyService.getInstance();
  private webSocketService: WebSocketService | null = null;
  private activeSessions = new Map<string, ConversationSession>();

  private constructor() {}

  public static getInstance(): ConversationEngine {
    if (!ConversationEngine.instance) {
      ConversationEngine.instance = new ConversationEngine();
    }
    return ConversationEngine.instance;
  }

  public setWebSocketService(service: WebSocketService): void {
    this.webSocketService = service;
  }

  public async startConversation(
    initialPrompt: string,
    persona: PersonaType,
    config?: Partial<ConversationConfig>
  ): Promise<ConversationSession> {
    const sessionId = uuidv4();
    const fullConfig: ConversationConfig = {
      maxTurns: parseInt(process.env.MAX_CONVERSATION_TURNS || '20'),
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

    // Log conversation start
    this.logger.logConversationStart(sessionId, persona, initialPrompt);

    // Broadcast to WebSocket clients
    this.broadcastSessionUpdate(session);

    return session;
  }

  public async processUserMessage(
    sessionId: string,
    userMessage: string
  ): Promise<ConversationMessage> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active' && session.status !== 'pending') {
      throw new Error(`Session ${sessionId} is not active`);
    }

    // Update session status to active
    if (session.status === 'pending') {
      session.status = 'active';
      await this.updateSessionStatus(sessionId, 'active');
    }

    // Create user message
    const userMsg: ConversationMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Add message to session
    session.messages.push(userMsg);
    await this.saveMessage(sessionId, userMsg);

    // Process with Forethought
    const forethoughtResponse = await this.forethoughtService.processMessage(
      userMessage,
      sessionId
    );

    // Create assistant message with metadata
    const assistantMsg: ConversationMessage = {
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

    // Validate against policies if enabled
    if (session.configuration.enablePolicyValidation) {
      const policyViolations = await this.policyService.validateMessage(assistantMsg);
      if (policyViolations.length > 0) {
        assistantMsg.metadata!.policyViolations = policyViolations.map(v => v.message);
        
        // Log violations
        policyViolations.forEach(violation => {
          this.logger.logPolicyViolation(
            sessionId,
            assistantMsg.id,
            violation.message,
            violation.severity
          );
        });
      }
    }

    // Add assistant message to session
    session.messages.push(assistantMsg);
    await this.saveMessage(sessionId, assistantMsg);

    // Generate LLM response for next user turn
    await this.generateNextUserMessage(session);

    // Check if conversation should end
    await this.checkConversationEnd(session);

    // Update session in memory
    this.activeSessions.set(sessionId, session);

    // Broadcast update
    this.broadcastSessionUpdate(session);

    return assistantMsg;
  }

  private async generateNextUserMessage(session: ConversationSession): Promise<void> {
    if (session.messages.length >= session.configuration.maxTurns) {
      return;
    }

    const context: ConversationContext = {
      sessionId: session.id,
      persona: session.persona,
      currentTurn: session.messages.length / 2,
      lastForethoughtResponse: session.messages[session.messages.length - 1]?.content,
      lastIntent: session.messages[session.messages.length - 1]?.metadata?.intent,
      lastActions: session.messages[session.messages.length - 1]?.metadata?.actions,
      conversationGoal: session.initialPrompt
    };

    try {
      // Convert messages to LLM format
      const llmMessages = session.messages.map(msg => ({
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

      // Create the generated user message
      const generatedMsg: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: llmResponse.message.content,
        timestamp: new Date(),
        metadata: {
          processingTime: llmResponse.processingTime
        }
      };

      // Add to session and save
      session.messages.push(generatedMsg);
      await this.saveMessage(session.id, generatedMsg);

    } catch (error) {
      this.logger.error('Failed to generate next user message', error);
      // Continue conversation without generated message
    }
  }

  private async checkConversationEnd(session: ConversationSession): Promise<void> {
    const shouldEnd = 
      session.messages.length >= session.configuration.maxTurns ||
      (session.startTime && Date.now() - session.startTime.getTime() > session.configuration.timeoutMs) ||
      this.isConversationResolved(session);

    if (shouldEnd) {
      await this.endConversation(session.id);
    }
  }

  private isConversationResolved(session: ConversationSession): boolean {
    // Check if the last few messages indicate resolution
    const lastMessages = session.messages.slice(-4);
    const resolvedKeywords = ['resolved', 'solved', 'thank you', 'thanks', 'goodbye', 'bye'];
    
    return lastMessages.some(msg => 
      resolvedKeywords.some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      )
    );
  }

  public async endConversation(sessionId: string): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'completed';
    session.endTime = new Date();

    // Generate conversation analysis
    session.analysis = await this.generateAnalysis(session);

    // Save final session state
    await this.saveSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Log conversation end
    const duration = session.endTime.getTime() - session.startTime.getTime();
    this.logger.logConversationEnd(sessionId, session.messages.length, duration);

    // Broadcast final update
    this.broadcastSessionUpdate(session);

    return session;
  }

  private async generateAnalysis(session: ConversationSession): Promise<ConversationAnalysis> {
    const messages = session.messages;
    const duration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    // Calculate metrics
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const totalResponseTime = assistantMessages.reduce(
      (sum, msg) => sum + (msg.metadata?.processingTime || 0), 
      0
    );
    const averageResponseTime = assistantMessages.length > 0 
      ? totalResponseTime / assistantMessages.length 
      : 0;

    // Intent accuracy
    const messagesWithIntents = assistantMessages.filter(m => m.metadata?.intent);
    const intentAccuracy = messagesWithIntents.length > 0 
      ? messagesWithIntents.reduce((sum, msg) => sum + (msg.metadata?.confidence || 0), 0) / messagesWithIntents.length
      : 0;

    // Policy compliance
    const policyViolations = messages.filter(m => 
      m.metadata?.policyViolations && m.metadata.policyViolations.length > 0
    );
    const policyComplianceScore = policyViolations.length === 0 
      ? 1.0 
      : Math.max(0, 1 - (policyViolations.length / assistantMessages.length));

    // Action execution success
    const messagesWithActions = assistantMessages.filter(m => 
      m.metadata?.actions && m.metadata.actions.length > 0
    );
    const actionExecutionSuccess = messagesWithActions.length > 0 ? 0.9 : 1.0; // Placeholder logic

    // Overall conversation quality score
    const conversationQuality = (
      intentAccuracy * 0.3 +
      policyComplianceScore * 0.3 +
      actionExecutionSuccess * 0.2 +
      (session.status === 'completed' ? 0.2 : 0)
    );

    // Generate issues
    const issues: AnalysisIssue[] = [];
    
    // Add policy violation issues
    policyViolations.forEach(msg => {
      if (msg.metadata?.policyViolations) {
        msg.metadata.policyViolations.forEach(violation => {
          issues.push({
            type: 'policy_violation',
            severity: 'medium',
            message: violation,
            messageId: msg.id,
            suggestion: 'Review policy compliance guidelines'
          });
        });
      }
    });

    // Add low confidence intent issues
    messagesWithIntents.forEach(msg => {
      if (msg.metadata?.confidence && msg.metadata.confidence < 0.7) {
        issues.push({
          type: 'intent_miss',
          severity: 'high',
          message: `Low confidence intent recognition: ${msg.metadata.intent}`,
          messageId: msg.id,
          suggestion: 'Consider improving intent training data'
        });
      }
    });

    return {
      totalMessages: messages.length,
      averageResponseTime,
      intentAccuracy,
      policyComplianceScore,
      actionExecutionSuccess,
      conversationQuality,
      issues,
      summary: this.generateAnalysisSummary(session, conversationQuality, issues.length)
    };
  }

  private generateAnalysisSummary(session: ConversationSession, quality: number, issueCount: number): string {
    const qualityText = quality >= 0.8 ? 'excellent' : quality >= 0.6 ? 'good' : 'needs improvement';
    const issueText = issueCount === 0 ? 'no issues detected' : `${issueCount} issue(s) found`;
    
    return `Conversation completed with ${qualityText} quality score (${Math.round(quality * 100)}%). ` +
           `${session.messages.length} total messages exchanged over ${session.persona} persona. ` +
           `Analysis shows ${issueText}.`;
  }

  // Database operations
  private async saveSession(session: ConversationSession): Promise<void> {
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
  }

  private async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
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
  }

  private async updateSessionStatus(sessionId: string, status: ConversationStatus): Promise<void> {
    const db = await DatabaseService.getInstance().getDatabase();
    
    await db.run(`
      UPDATE conversation_sessions 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [status, sessionId]);
  }

  public async getSession(sessionId: string): Promise<ConversationSession | null> {
    // Check memory cache first
    const cachedSession = this.activeSessions.get(sessionId);
    if (cachedSession) {
      return cachedSession;
    }

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
  }

  public async getAllSessions(limit = 50, offset = 0): Promise<ConversationSession[]> {
    const db = await DatabaseService.getInstance().getDatabase();
    
    const sessionRows = await db.all(`
      SELECT * FROM conversation_sessions 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const sessions: ConversationSession[] = [];
    
    for (const row of sessionRows) {
      const messagesRows = await db.all(`
        SELECT * FROM conversation_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `, [row.id]);

      sessions.push({
        id: row.id,
        initialPrompt: row.initial_prompt,
        persona: row.persona as PersonaType,
        status: row.status as ConversationStatus,
        messages: messagesRows.map(msgRow => ({
          id: msgRow.id,
          role: msgRow.role as 'user' | 'assistant' | 'system',
          content: msgRow.content,
          timestamp: new Date(msgRow.timestamp),
          metadata: msgRow.metadata ? JSON.parse(msgRow.metadata) : undefined
        })),
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        configuration: JSON.parse(row.configuration),
        analysis: row.analysis ? JSON.parse(row.analysis) : undefined
      });
    }

    return sessions;
  }

  public getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  public async cancelConversation(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'cancelled';
    session.endTime = new Date();

    await this.saveSession(session);
    this.activeSessions.delete(sessionId);
    this.broadcastSessionUpdate(session);
  }

  private broadcastSessionUpdate(session: ConversationSession): void {
    if (this.webSocketService) {
      this.webSocketService.broadcastToAll('session_update', {
        sessionId: session.id,
        status: session.status,
        messageCount: session.messages.length,
        analysis: session.analysis
      });
    }
  }

  // Cleanup method for long-running processes
  public async cleanup(): Promise<void> {
    // End any sessions that have timed out
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startTime.getTime();
      if (sessionAge > session.configuration.timeoutMs) {
        this.logger.warn(`Session ${sessionId} timed out, ending conversation`);
        await this.endConversation(sessionId);
      }
    }
  }
}