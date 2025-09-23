export interface ForethoughtResponse {
  response: string;
  intent: string;
  confidence: number;
  actions: string[];
  processingTime: number;
  metadata?: {
    sessionId?: string;
    userId?: string;
  };
}

export class ForethoughtService {
  private static instance: ForethoughtService;

  private constructor() {}

  public static getInstance(): ForethoughtService {
    if (!ForethoughtService.instance) {
      ForethoughtService.instance = new ForethoughtService();
    }
    return ForethoughtService.instance;
  }

  public async processMessage(
    message: string,
    sessionId?: string
  ): Promise<ForethoughtResponse> {
    const startTime = Date.now();

    // Create realistic mock responses based on the message content
    const response = this.createMockResponse(message, sessionId, startTime);
    
    console.log(`Forethought processed message (mock): ${response.intent} (${response.confidence})`);
    
    return response;
  }

  private createMockResponse(message: string, sessionId?: string, startTime?: number): ForethoughtResponse {
    const lowerMessage = message.toLowerCase();
    const mockResponses = [
      {
        intent: 'billing_inquiry', 
        confidence: 0.9, 
        response: "I can help you with billing questions. What specific billing issue are you experiencing?",
        actions: ['lookup_billing_info', 'prepare_bill_explanation']
      },
      {
        intent: 'technical_support', 
        confidence: 0.85, 
        response: "I'll help you resolve this technical issue. Can you provide more details about what you're experiencing?",
        actions: ['create_support_ticket', 'gather_system_info']
      },
      {
        intent: 'account_access', 
        confidence: 0.8, 
        response: "I can assist with account access issues. Are you having trouble logging in?",
        actions: ['initiate_password_reset', 'verify_identity']
      },
      {
        intent: 'general_inquiry', 
        confidence: 0.7, 
        response: "Thank you for your message. How can I assist you today?",
        actions: ['route_to_general_support']
      }
    ];

    // Simple intent detection based on keywords
    let selectedResponse = mockResponses[3]; // default to general_inquiry

    if (lowerMessage.includes('bill') || lowerMessage.includes('payment') || lowerMessage.includes('charge')) {
      selectedResponse = mockResponses[0];
    } else if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('not working')) {
      selectedResponse = mockResponses[1];
    } else if (lowerMessage.includes('login') || lowerMessage.includes('password') || lowerMessage.includes('account')) {
      selectedResponse = mockResponses[2];
    }

    const processingTime = startTime ? Date.now() - startTime : Math.random() * 500 + 200;

    return {
      response: selectedResponse.response,
      intent: selectedResponse.intent,
      confidence: selectedResponse.confidence + (Math.random() * 0.1 - 0.05), // Add some variance
      actions: selectedResponse.actions,
      processingTime: Math.round(processingTime),
      metadata: { sessionId }
    };
  }
}