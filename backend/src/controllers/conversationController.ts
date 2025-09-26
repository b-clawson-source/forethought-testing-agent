import { Request, Response } from 'express';
import { ForethoughtService } from '../services/forethoughtService';
import OpenAI from 'openai';

// Initialize services
const forethoughtService = new ForethoughtService();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active conversations
const activeConversations = new Map();

export class ConversationController {
  
  /**
   * Handle message in conversation - THIS IS THE KEY ENDPOINT TO FIX
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { message, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message is required'
        });
      }

      const currentSessionId = sessionId || `session-${Date.now()}`;

      console.log(`[CONVERSATION] Incoming message: "${message}"`);

      // Get response from REAL Forethought service (not mock)
      const forethoughtResponse = await forethoughtService.sendMessage(message, currentSessionId);
      
      console.log(`[CONVERSATION] Forethought response: "${forethoughtResponse.response}"`);
      console.log(`[CONVERSATION] Intent: ${forethoughtResponse.intent} (${forethoughtResponse.confidence}% confidence)`);

      // Store conversation in memory
      if (!activeConversations.has(currentSessionId)) {
        activeConversations.set(currentSessionId, {
          sessionId: currentSessionId,
          messages: [],
          startTime: new Date()
        });
      }

      const conversation = activeConversations.get(currentSessionId);
      
      // Add customer message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Add agent response
      conversation.messages.push({
        role: 'assistant',
        content: forethoughtResponse.response,
        timestamp: new Date(),
        metadata: {
          intent: forethoughtResponse.intent,
          confidence: forethoughtResponse.confidence,
          suggestedActions: forethoughtResponse.suggestedActions,
          knowledgeBaseArticles: forethoughtResponse.knowledgeBaseArticles
        }
      });

      // Return response in the format your system expects
      res.json({
        success: true,
        response: forethoughtResponse.response,
        message: forethoughtResponse.response, // For backward compatibility
        intent: forethoughtResponse.intent,
        confidence: forethoughtResponse.confidence,
        sessionId: currentSessionId,
        suggestedActions: forethoughtResponse.suggestedActions,
        knowledgeBaseArticles: forethoughtResponse.knowledgeBaseArticles,
        conversationLength: conversation.messages.length
      });

    } catch (error) {
      console.error('[CONVERSATION] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start freeform conversation with OpenAI customer simulation
   */
  static async startFreeformConversation(req: Request, res: Response) {
    try {
      const { query, maxTurns = 10, persona = 'polite' } = req.body;

      if (!query) {
        return res.status(400).json({
          error: 'Initial query is required'
        });
      }

      const conversationId = `freeform-${Date.now()}`;
      let currentMessage = query;
      let turnCount = 0;
      const conversation = {
        id: conversationId,
        messages: [],
        resolved: false,
        persona
      };

      console.log(`[FREEFORM] Starting conversation with persona: ${persona}`);
      console.log(`[FREEFORM] Initial query: "${query}"`);

      while (turnCount < maxTurns) {
        turnCount++;

        // Customer message
        conversation.messages.push({
          role: 'user',
          content: currentMessage,
          timestamp: new Date(),
          turn: turnCount
        });

        console.log(`[FREEFORM] Turn ${turnCount} - Customer: "${currentMessage}"`);

        // Get REAL Forethought response
        const forethoughtResponse = await forethoughtService.sendMessage(currentMessage, conversationId);
        
        console.log(`[FREEFORM] Turn ${turnCount} - Agent: "${forethoughtResponse.response}"`);
        console.log(`[FREEFORM] Intent: ${forethoughtResponse.intent} (${forethoughtResponse.confidence}% confidence)`);

        // Agent response
        conversation.messages.push({
          role: 'assistant',
          content: forethoughtResponse.response,
          timestamp: new Date(),
          turn: turnCount,
          metadata: {
            intent: forethoughtResponse.intent,
            confidence: forethoughtResponse.confidence,
            suggestedActions: forethoughtResponse.suggestedActions
          }
        });

        // Check if conversation should end (customer satisfaction)
        const shouldEnd = await ConversationController.shouldEndConversation(
          conversation.messages,
          persona
        );

        if (shouldEnd.shouldEnd) {
          conversation.resolved = shouldEnd.resolved;
          console.log(`[FREEFORM] Conversation ended: ${shouldEnd.reason}`);
          break;
        }

        // Generate next customer message using OpenAI
        currentMessage = await ConversationController.generateCustomerResponse(
          conversation.messages,
          persona,
          forethoughtResponse.response
        );

        if (!currentMessage) {
          console.log(`[FREEFORM] Customer ended conversation (no response generated)`);
          conversation.resolved = true;
          break;
        }
      }

      // Store conversation
      activeConversations.set(conversationId, conversation);

      res.json({
        success: true,
        conversationId,
        totalTurns: conversation.messages.length,
        resolved: conversation.resolved,
        messages: conversation.messages,
        summary: {
          persona,
          turns: Math.ceil(conversation.messages.length / 2),
          resolved: conversation.resolved,
          finalIntent: conversation.messages[conversation.messages.length - 1]?.metadata?.intent
        }
      });

    } catch (error) {
      console.error('[FREEFORM] Error:', error);
      res.status(500).json({
        error: 'Failed to start freeform conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate customer response using OpenAI
   */
  static async generateCustomerResponse(
    messages: any[],
    persona: string,
    lastAgentResponse: string
  ): Promise<string> {
    
    if (!process.env.OPENAI_API_KEY) {
      // Fallback responses for different personas
      const fallbackResponses = {
        frustrated: ["This is taking too long!", "I need this fixed now!", "This is ridiculous!"],
        confused: ["I don't understand", "Can you explain that better?", "What does that mean?"],
        polite: ["Thank you for your help", "I appreciate your assistance", "That makes sense"],
        impatient: ["Just tell me how to fix it", "I don't have time for this", "Give me the quick solution"],
        technical: ["What's the root cause?", "Can you provide more technical details?", "Is this a known issue?"]
      };
      
      const responses = fallbackResponses[persona as keyof typeof fallbackResponses] || fallbackResponses.polite;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    try {
      const conversationContext = messages
        .slice(-6) // Last 3 exchanges
        .map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
        .join('\n');

      const personaDescriptions = {
        frustrated: "You are a frustrated customer who has been dealing with this issue for a while. You're impatient and want quick solutions.",
        confused: "You are a confused customer who doesn't understand technical terms. You ask clarifying questions and need simple explanations.",
        polite: "You are a polite, courteous customer. You're patient and appreciative of help.",
        impatient: "You are a busy customer who wants quick solutions without long explanations.",
        technical: "You are a tech-savvy customer who understands technical details and wants specific information."
      };

      const prompt = `${personaDescriptions[persona as keyof typeof personaDescriptions] || personaDescriptions.polite}

Recent conversation:
${conversationContext}

Agent just said: "${lastAgentResponse}"

Generate your next realistic response as a customer. Your response should:
1. Match your persona (${persona})
2. Respond appropriately to what the agent said
3. Either continue the conversation if not satisfied, or thank them if the issue seems resolved
4. Be 1-2 sentences maximum
5. Sound like a real customer would speak

If the agent provided a good solution and you're satisfied, express thanks and indicate the issue is resolved.
If not satisfied, continue asking questions or expressing concerns appropriate to your persona.

Customer response:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content?.trim() || '';
      
      // Don't continue if customer seems satisfied
      if (response.toLowerCase().includes('thank') && 
          (response.toLowerCase().includes('help') || response.toLowerCase().includes('resolve'))) {
        return '';
      }

      return response;

    } catch (error) {
      console.error('[OPENAI] Error generating customer response:', error);
      return ''; // End conversation on error
    }
  }

  /**
   * Determine if conversation should end
   */
  static async shouldEndConversation(
    messages: any[],
    persona: string
  ): Promise<{ shouldEnd: boolean; resolved: boolean; reason: string }> {
    
    const lastCustomerMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content?.toLowerCase() || '';

    const lastAgentMessage = messages
      .filter(m => m.role === 'assistant')  
      .pop()?.content?.toLowerCase() || '';

    // Check for satisfaction indicators
    if (lastCustomerMessage.includes('thank') && 
        (lastCustomerMessage.includes('help') || lastCustomerMessage.includes('resolve'))) {
      return { shouldEnd: true, resolved: true, reason: 'Customer expressed satisfaction' };
    }

    // Check for resolution indicators in agent response
    if (lastAgentMessage.includes('resolved') || 
        lastAgentMessage.includes('completed') ||
        lastAgentMessage.includes('fixed')) {
      return { shouldEnd: false, resolved: false, reason: 'Continue to confirm resolution' };
    }

    // Persona-specific ending conditions
    if (persona === 'frustrated' && messages.length > 8) {
      return { shouldEnd: true, resolved: false, reason: 'Frustrated customer patience expired' };
    }

    if (persona === 'impatient' && messages.length > 6) {
      return { shouldEnd: true, resolved: false, reason: 'Impatient customer gave up' };
    }

    // General conversation length limits
    if (messages.length > 16) {
      return { shouldEnd: true, resolved: false, reason: 'Maximum conversation length reached' };
    }

    return { shouldEnd: false, resolved: false, reason: 'Continue conversation' };
  }

  /**
   * Get conversation by session ID
   */
  static async getConversation(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const conversation = activeConversations.get(sessionId);
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        conversation
      });

    } catch (error) {
      console.error('[CONVERSATION] Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to get conversation'
      });
    }
  }

  /**
   * Get all conversations
   */
  static async getConversations(req: Request, res: Response) {
    try {
      const conversations = Array.from(activeConversations.values());

      res.json({
        success: true,
        conversations,
        total: conversations.length
      });

    } catch (error) {
      console.error('[CONVERSATION] Get conversations error:', error);
      res.status(500).json({
        error: 'Failed to get conversations'
      });
    }
  }

  /**
   * Test Forethought connectivity
   */
  static async testForethought(req: Request, res: Response) {
    try {
      console.log('[TEST] Testing Forethought connectivity...');
      
      const testResult = await forethoughtService.testConnectivity();
      
      res.json({
        success: testResult.success,
        ...testResult
      });

    } catch (error) {
      console.error('[TEST] Forethought test error:', error);
      res.status(500).json({
        success: false,
        error: 'Forethought test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}