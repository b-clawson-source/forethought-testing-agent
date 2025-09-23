import { v4 as uuidv4 } from 'uuid';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    actions?: string[];
    processingTime?: number;
  };
}

interface Conversation {
  id: string;
  initialPrompt: string;
  persona: string;
  status: 'active' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  turnCount: number;
  maxTurns: number;
}

export class SimpleConversationEngine {
  private static instance: SimpleConversationEngine;
  private activeConversations = new Map<string, Conversation>();

  private constructor() {}

  public static getInstance(): SimpleConversationEngine {
    if (!SimpleConversationEngine.instance) {
      SimpleConversationEngine.instance = new SimpleConversationEngine();
    }
    return SimpleConversationEngine.instance;
  }

  public async startConversation(initialPrompt: string, persona: string): Promise<Conversation> {
    const sessionId = uuidv4();
    
    console.log(`🎭 Generating ${persona} customer message for: "${initialPrompt}"`);
    
    // Generate the first customer message using OpenAI
    const customerMessage = await this.generateCustomerMessage(persona, initialPrompt, []);
    
    console.log(`💬 Customer: "${customerMessage}"`);
    
    // Generate support response
    const supportResponse = this.generateSupportResponse(customerMessage);
    
    console.log(`🤖 Support: "${supportResponse.response}" (${supportResponse.intent})`);

    const conversation: Conversation = {
      id: sessionId,
      initialPrompt,
      persona,
      status: 'active',
      startTime: new Date(),
      turnCount: 1,
      maxTurns: 6, // Limit conversations to prevent runaway
      messages: [
        {
          id: uuidv4(),
          role: 'user',
          content: customerMessage,
          timestamp: new Date()
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: supportResponse.response,
          timestamp: new Date(),
          metadata: {
            intent: supportResponse.intent,
            confidence: supportResponse.confidence,
            actions: supportResponse.actions,
            processingTime: supportResponse.processingTime
          }
        }
      ]
    };

    this.activeConversations.set(sessionId, conversation);
    
    return conversation;
  }

  public async continueConversation(sessionId: string): Promise<Conversation | null> {
    const conversation = this.activeConversations.get(sessionId);
    
    if (!conversation) {
      return null;
    }

    if (conversation.status !== 'active' || conversation.turnCount >= conversation.maxTurns) {
      conversation.status = 'completed';
      conversation.endTime = new Date();
      return conversation;
    }

    try {
      // Get the last support response to react to
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      
      if (lastMessage.role === 'assistant') {
        // Generate next customer response
        console.log(`🎭 Generating ${conversation.persona} response to: "${lastMessage.content.substring(0, 50)}..."`);
        
        const customerResponse = await this.generateCustomerMessage(
          conversation.persona,
          conversation.initialPrompt,
          conversation.messages
        );
        
        console.log(`💬 Customer: "${customerResponse}"`);
        
        // Add customer message
        conversation.messages.push({
          id: uuidv4(),
          role: 'user',
          content: customerResponse,
          timestamp: new Date()
        });

        // Generate support response
        const supportResponse = this.generateSupportResponse(customerResponse, conversation.messages);
        
        console.log(`🤖 Support: "${supportResponse.response}" (${supportResponse.intent})`);

        // Add support message
        conversation.messages.push({
          id: uuidv4(),
          role: 'assistant',
          content: supportResponse.response,
          timestamp: new Date(),
          metadata: {
            intent: supportResponse.intent,
            confidence: supportResponse.confidence,
            actions: supportResponse.actions,
            processingTime: supportResponse.processingTime
          }
        });

        conversation.turnCount++;

        // Check if conversation should end
        if (conversation.turnCount >= conversation.maxTurns || this.shouldEndConversation(conversation)) {
          conversation.status = 'completed';
          conversation.endTime = new Date();
          console.log(`✅ Conversation ${sessionId} completed after ${conversation.turnCount} turns`);
        }
      }

      return conversation;
    } catch (error) {
      console.error(`❌ Error continuing conversation ${sessionId}:`, error);
      conversation.status = 'failed';
      conversation.endTime = new Date();
      return conversation;
    }
  }

  private async generateCustomerMessage(
    persona: string, 
    initialPrompt: string, 
    messageHistory: ConversationMessage[]
  ): Promise<string> {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = this.getPersonaPrompt(persona, initialPrompt, messageHistory);
    
    // Build conversation context
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent conversation history (last 4 messages for context)
    const recentMessages = messageHistory.slice(-4);
    recentMessages.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'assistant' : 'user', // Flip roles since we're the customer
        content: msg.content
      });
    });

    // Add instruction for next message
    if (messageHistory.length === 0) {
      messages.push({ 
        role: 'user', 
        content: 'Generate your first message to the support agent about your issue.' 
      });
    } else {
      messages.push({ 
        role: 'user', 
        content: 'Respond to the support agent\'s last message. Stay in character.' 
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      max_tokens: 200,
      temperature: 0.8
    });

    return completion.choices[0]?.message?.content || "I need help with my issue.";
  }

  private getPersonaPrompt(persona: string, initialPrompt: string, messageHistory: ConversationMessage[]): string {
    const baseContext = messageHistory.length === 0 
      ? `You are starting a support conversation about: ${initialPrompt}`
      : `You are continuing a support conversation. Your original issue was: ${initialPrompt}`;

    const personas: Record<string, string> = {
      frustrated_customer: `${baseContext}

You are a FRUSTRATED and IMPATIENT customer. Key traits:
- Show clear frustration and urgency
- Use phrases like "This is unacceptable", "I want this fixed NOW", "I've been waiting too long"
- Be demanding but not abusive
- Want immediate action and escalation
- Don't accept delays or excuses
- Mention time pressure and impact on your business/life
- Sound irritated and on edge

Keep responses under 150 words. Be authentically frustrated.`,

      neutral_customer: `${baseContext}

You are a POLITE but CONCERNED customer. Key traits:
- Remain courteous and professional
- Clearly state your concerns
- Ask reasonable questions
- Show patience but expect resolution
- Use "please" and "thank you"
- Be cooperative with requests
- Express concern without anger

Keep responses under 150 words. Be polite but persistent.`,

      technical_user: `${baseContext}

You are a TECHNICALLY KNOWLEDGEABLE customer. Key traits:
- Use technical terminology correctly
- Mention specific error codes, log entries, or technical details
- Reference what troubleshooting you've already tried
- Ask technical questions about systems and processes
- Be precise and detailed in descriptions
- Show understanding of technical concepts
- Ask for specific technical solutions

Keep responses under 150 words. Be technically accurate.`,

      non_technical_user: `${baseContext}

You are a NON-TECHNICAL customer who needs simple explanations. Key traits:
- Use simple, non-technical language
- Ask for clarification on technical terms
- Express confusion about technical processes
- Need step-by-step guidance
- Say things like "I'm not very good with computers"
- Ask "What does that mean?" frequently
- Prefer simple solutions

Keep responses under 150 words. Sound genuinely confused by technical jargon.`
    };

    return personas[persona] || personas.neutral_customer;
  }

  private generateSupportResponse(
    customerMessage: string, 
    messageHistory: ConversationMessage[] = []
  ) {
    const startTime = Date.now();
    const lowerMessage = customerMessage.toLowerCase();
    
    // More sophisticated intent detection
    let intent = 'general_inquiry';
    let confidence = 0.7;
    let response = '';
    let actions: string[] = [];

    if (lowerMessage.includes('billing') || lowerMessage.includes('charge') || lowerMessage.includes('payment') || lowerMessage.includes('refund')) {
      intent = 'billing_inquiry';
      confidence = 0.92;
      actions = ['lookup_billing_history', 'verify_charges', 'prepare_dispute_form'];
      
      if (lowerMessage.includes('unauthorized') || lowerMessage.includes('didn\'t authorize') || lowerMessage.includes('dispute')) {
        response = "I completely understand your concern about the unauthorized charge. This is definitely something we need to investigate immediately. I'm pulling up your billing history now and will place a temporary hold on the disputed amount while we review this. Can you tell me the exact amount and date of the charge you're questioning?";
      } else if (lowerMessage.includes('refund')) {
        response = "I can help you with the refund request. Let me review your account and the specific transaction. To process this efficiently, I'll need to verify a few details about the charge and determine if it meets our refund criteria. What was the date and amount of the transaction you'd like refunded?";
      } else {
        response = "I understand you have a billing question. I'm here to help resolve this for you. Let me access your account information so I can provide you with accurate details about your charges. Can you help me identify which specific charge or billing period you're concerned about?";
      }
    }
    else if (lowerMessage.includes('login') || lowerMessage.includes('password') || lowerMessage.includes('access') || lowerMessage.includes('account')) {
      intent = 'account_access';
      confidence = 0.88;
      actions = ['verify_identity', 'check_account_status', 'initiate_password_reset'];
      response = "I can definitely help you regain access to your account. For security purposes, I'll need to verify your identity first. Can you confirm the email address associated with your account? Once verified, I can assist with resetting your password or troubleshooting any access issues.";
    }
    else if (lowerMessage.includes('error') || lowerMessage.includes('not working') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      intent = 'technical_support';
      confidence = 0.85;
      actions = ['gather_error_details', 'check_system_status', 'create_support_ticket'];
      response = "I'm sorry you're experiencing technical difficulties. To help resolve this quickly, I'll need to gather some details about the error. Can you tell me exactly what happens when you encounter this issue? Also, what browser or device are you using when this occurs?";
    }
    else if (lowerMessage.includes('cancel') || lowerMessage.includes('close') || lowerMessage.includes('terminate')) {
      intent = 'account_cancellation';
      confidence = 0.90;
      actions = ['review_account', 'offer_retention', 'process_cancellation'];
      response = "I understand you're considering cancelling your account. Before we proceed, I'd love to see if there's anything we can do to address your concerns and improve your experience. Can you share what's prompting this decision? There might be options or solutions we haven't explored yet.";
    }
    else {
      response = "Thank you for contacting our support team. I'm here to help resolve your concern as quickly as possible. To ensure I provide you with the most accurate assistance, can you provide a bit more detail about the specific issue you're experiencing?";
      actions = ['gather_more_info', 'route_to_specialist'];
    }

    // Add some personality based on conversation history
    if (messageHistory.length > 2) {
      const customerSeemsUrgent = messageHistory.some(msg => 
        msg.role === 'user' && (
          msg.content.toLowerCase().includes('urgent') || 
          msg.content.toLowerCase().includes('immediately') ||
          msg.content.toLowerCase().includes('asap')
        )
      );
      
      if (customerSeemsUrgent) {
        response = "I understand this is urgent for you. " + response;
        actions.push('escalate_priority');
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      response,
      intent,
      confidence: Math.min(confidence + (Math.random() * 0.1 - 0.05), 1.0), // Add slight variance
      actions,
      processingTime
    };
  }

  private shouldEndConversation(conversation: Conversation): boolean {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    
    // End if conversation seems resolved
    const resolvedKeywords = ['thank you', 'thanks', 'resolved', 'solved', 'perfect', 'great', 'satisfied'];
    const hasResolutionIndicator = lastMessage && resolvedKeywords.some(keyword => 
      lastMessage.content.toLowerCase().includes(keyword)
    );

    return hasResolutionIndicator;
  }

  public getConversation(sessionId: string): Conversation | undefined {
    return this.activeConversations.get(sessionId);
  }

  public getAllConversations(): Conversation[] {
    return Array.from(this.activeConversations.values());
  }

  public getActiveConversations(): Conversation[] {
    return Array.from(this.activeConversations.values()).filter(c => c.status === 'active');
  }
}
