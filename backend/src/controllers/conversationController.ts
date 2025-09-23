import { Request, Response } from 'express';
import { ConversationEngine } from '../services/conversationEngine';
import { PersonaType } from '../../shared/types/conversation';

const conversationEngine = ConversationEngine.getInstance();

export class ConversationController {
  public static async startConversation(req: Request, res: Response): Promise<void> {
    try {
      const { initialPrompt, persona, configuration } = req.body;

      if (!initialPrompt || !persona) {
        res.status(400).json({
          success: false,
          error: 'initialPrompt and persona are required'
        });
        return;
      }

      console.log(`Starting conversation: ${persona} - ${initialPrompt.substring(0, 50)}...`);

      const session = await conversationEngine.startConversation(
        initialPrompt,
        persona as PersonaType,
        configuration
      );

      res.status(201).json({
        success: true,
        data: {
          session: {
            id: session.id,
            initialPrompt: session.initialPrompt,
            persona: session.persona,
            status: session.status,
            startTime: session.startTime,
            configuration: session.configuration,
            messageCount: session.messages.length
          }
        }
      });
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  public static async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const session = await conversationEngine.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: {
            ...session,
            messageCount: session.messages.length,
            duration: session.endTime 
              ? session.endTime.getTime() - session.startTime.getTime()
              : Date.now() - session.startTime.getTime()
          }
        }
      });
    } catch (error: any) {
      console.error('Failed to get conversation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  public static async getAllConversations(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const sessions = await conversationEngine.getAllSessions(limit);

      const sessionsWithSummary = sessions.map(session => ({
        id: session.id,
        initialPrompt: session.initialPrompt.substring(0, 100) + (session.initialPrompt.length > 100 ? '...' : ''),
        persona: session.persona,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        messageCount: session.messages.length,
        duration: session.endTime 
          ? session.endTime.getTime() - session.startTime.getTime()
          : Date.now() - session.startTime.getTime(),
        analysisScore: session.analysis?.conversationQuality || null
      }));

      res.json({
        success: true,
        data: {
          sessions: sessionsWithSummary,
          total: sessions.length
        }
      });
    } catch (error: any) {
      console.error('Failed to get conversations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  public static async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const session = await conversationEngine.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          messages: session.messages,
          total: session.messages.length
        }
      });
    } catch (error: any) {
      console.error('Failed to get messages:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await conversationEngine.getAllSessions(100);
      const activeSessionIds = conversationEngine.getActiveSessionIds();
      
      const stats = {
        active: activeSessionIds.length,
        total: sessions.length,
        completed: sessions.filter(s => s.status === 'completed').length,
        failed: sessions.filter(s => s.status === 'failed').length,
        averageMessages: sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + s.messages.length, 0) / sessions.length 
          : 0,
        byPersona: {} as Record<string, number>
      };

      // Count by persona
      sessions.forEach(session => {
        stats.byPersona[session.persona] = (stats.byPersona[session.persona] || 0) + 1;
      });

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error: any) {
      console.error('Failed to get stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
