import axios from 'axios';

export interface ForethoughtResponse {
  response: string;
  intent: string;
  confidence: number;
  actions: string[];
  processingTime: number;
  metadata?: {
    sessionId?: string;
    userId?: string;
    knowledgeBaseArticles?: Array<{
      title: string;
      url: string;
      relevance: number;
    }>;
  };
}

export interface ForethoughtQuery {
  message: string;
  sessionId: string;
  context?: Record<string, any>;
}

export class ForethoughtService {
  private static instance: ForethoughtService;
  private apiKey: string;
  private baseUrl: string;
  private widgetId?: string;
  private useMockMode: boolean;

  private constructor() {
    this.apiKey = process.env.FORETHOUGHT_API_KEY || '';
    this.baseUrl = process.env.FORETHOUGHT_BASE_URL || 'https://api.forethought.ai';
    this.widgetId = process.env.FORETHOUGHT_WIDGET_ID;
    // Use mock mode if no API key is configured
    this.useMockMode = !this.apiKey || this.apiKey === 'your_forethought_api_key_here';
    
    if (this.useMockMode) {
      console.log('Forethought Service: Running in MOCK mode (no API key configured)');
    } else {
      console.log('Forethought Service: API key configured, using real integration');
    }
  }

  public static getInstance(): ForethoughtService {
    if (!ForethoughtService.instance) {
      ForethoughtService.instance = new ForethoughtService();
    }
    return ForethoughtService.instance;
  }

  /**
   * Main method to process messages through Forethought
   */
  public async processMessage(
    message: string,
    sessionId?: string
  ): Promise<ForethoughtResponse> {
    const startTime = Date.now();
    
    // Use mock mode if no API key
    if (this.useMockMode) {
      return this.createMockResponse(message, sessionId, startTime);
    }

    // Try real Forethought API
    try {
      const query: ForethoughtQuery = {
        message,
        sessionId: sessionId || `session_${Date.now()}`,
        context: {}
      };
      
      return await this.queryForethoughtAPI(query, startTime);
    } catch (error) {
      console.error('Forethought API error, falling back to mock:', error);
      return this.createMockResponse(message, sessionId, startTime);
    }
  }

  /**
   * Query the real Forethought API
   */
  private async queryForethoughtAPI(query: ForethoughtQuery, startTime: number): Promise<ForethoughtResponse> {
    try {
      // Option 1: Direct Forethought API
      const response = await axios.post(
        `${this.baseUrl}/v1/conversations/messages`,
        {
          message: query.message,
          session_id: query.sessionId,
          widget_id: this.widgetId,
          context: query.context
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      return this.parseForethoughtResponse(response.data, Date.now() - startTime);
    } catch (apiError: any) {
      // Try widget endpoint as fallback
      if (process.env.FORETHOUGHT_WIDGET_URL) {
        return this.queryWidgetEndpoint(query, startTime);
      }
      throw apiError;
    }
  }

  /**
   * Query Forethought through widget endpoint
   */
  private async queryWidgetEndpoint(query: ForethoughtQuery, startTime: number): Promise<ForethoughtResponse> {
    try {
      const response = await axios.post(
        `${process.env.FORETHOUGHT_WIDGET_URL}/chat`,
        {
          message: query.message,
          sessionId: query.sessionId,
          widgetId: this.widgetId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return this.parseForethoughtResponse(response.data, Date.now() - startTime);
    } catch (error) {
      console.error('Widget endpoint error:', error);
      throw error;
    }
  }

  /**
   * Parse Forethought API response into our format
   */
  private parseForethoughtResponse(data: any, processingTime: number): ForethoughtResponse {
    return {
      response: data.response || data.message || data.text || 'No response from Forethought',
      intent: data.intent?.name || data.intent || 'unknown',
      confidence: data.intent?.confidence || data.confidence || 0.5,
      actions: data.actions || data.suggested_actions || [],
      processingTime: processingTime,
      metadata: {
        sessionId: data.session_id,
        userId: data.user_id,
        knowledgeBaseArticles: data.articles?.map((article: any) => ({
          title: article.title,
          url: article.url,
          relevance: article.relevance_score || article.score || 0
        }))
      }
    };
  }

  /**
   * Create mock response for testing
   */
  private createMockResponse(message: string, sessionId?: string, startTime?: number): ForethoughtResponse {
    const lowerMessage = message.toLowerCase();
    
    // Define comprehensive mock responses
    const mockResponses = [
      {
        keywords: ['bill', 'payment', 'charge', 'invoice', 'refund'],
        intent: 'billing_inquiry',
        confidence: 0.92,
        response: "I can help you with your billing question. Let me check your account details. What specific billing issue are you experiencing?",
        actions: ['lookup_billing_info', 'check_payment_history', 'prepare_invoice']
      },
      {
        keywords: ['error', 'bug', 'crash', 'not working', 'broken', 'issue'],
        intent: 'technical_support',
        confidence: 0.88,
        response: "I understand you're experiencing technical difficulties. Can you describe what exactly is happening? Any error messages you're seeing would be helpful.",
        actions: ['create_support_ticket', 'gather_system_info', 'check_known_issues']
      },
      {
        keywords: ['login', 'password', 'access', 'account', 'sign in', 'locked'],
        intent: 'account_access',
        confidence: 0.85,
        response: "I can assist with account access issues. For security, I'll need to verify your identity first. Are you having trouble logging in, or is there another account issue?",
        actions: ['verify_identity', 'initiate_password_reset', 'unlock_account']
      },
      {
        keywords: ['feature', 'how to', 'guide', 'help', 'documentation'],
        intent: 'feature_inquiry',
        confidence: 0.83,
        response: "I'll help you understand how to use our features. What specific functionality would you like to learn about?",
        actions: ['provide_documentation', 'share_tutorial', 'schedule_demo']
      },
      {
        keywords: ['cancel', 'subscription', 'unsubscribe', 'delete'],
        intent: 'cancellation_request',
        confidence: 0.87,
        response: "I understand you're considering cancellation. Before we proceed, may I ask what issues you're experiencing? Perhaps I can help resolve them.",
        actions: ['retention_offer', 'gather_feedback', 'process_cancellation']
      },
      {
        keywords: ['upgrade', 'plan', 'pricing', 'premium', 'features'],
        intent: 'upgrade_inquiry',
        confidence: 0.89,
        response: "I'd be happy to explain our available plans and help you find the best option for your needs. What features are most important to you?",
        actions: ['show_pricing', 'compare_plans', 'offer_trial']
      }
    ];

    // Find best matching response
    let selectedResponse = null;
    let highestMatchScore = 0;

    for (const mockResp of mockResponses) {
      const matchScore = mockResp.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      ).length;
      
      if (matchScore > highestMatchScore) {
        highestMatchScore = matchScore;
        selectedResponse = mockResp;
      }
    }

    // Default to general inquiry if no keywords match
    if (!selectedResponse) {
      selectedResponse = {
        intent: 'general_inquiry',
        confidence: 0.65,
        response: "Thank you for reaching out. I'm here to help with any questions or issues you have. Could you please provide more details about what you need assistance with?",
        actions: ['gather_information', 'route_to_appropriate_team']
      };
    }

    // Add some variance to confidence
    const confidenceVariance = (Math.random() * 0.1 - 0.05);
    const processingTime = startTime ? Date.now() - startTime : Math.random() * 500 + 200;

    return {
      response: selectedResponse.response,
      intent: selectedResponse.intent,
      confidence: Math.min(0.99, Math.max(0.5, selectedResponse.confidence + confidenceVariance)),
      actions: selectedResponse.actions,
      processingTime: Math.round(processingTime),
      metadata: {
        sessionId: sessionId,
        knowledgeBaseArticles: this.generateMockArticles(selectedResponse.intent)
      }
    };
  }

  /**
   * Generate mock knowledge base articles
   */
  private generateMockArticles(intent: string): Array<{title: string; url: string; relevance: number}> {
    const articles: Record<string, Array<{title: string; url: string; relevance: number}>> = {
      billing_inquiry: [
        { title: 'Understanding Your Bill', url: '/kb/billing-overview', relevance: 0.95 },
        { title: 'Payment Methods', url: '/kb/payment-methods', relevance: 0.82 },
        { title: 'Refund Policy', url: '/kb/refunds', relevance: 0.78 }
      ],
      technical_support: [
        { title: 'Troubleshooting Guide', url: '/kb/troubleshooting', relevance: 0.92 },
        { title: 'Common Error Messages', url: '/kb/errors', relevance: 0.87 },
        { title: 'System Requirements', url: '/kb/requirements', relevance: 0.73 }
      ],
      account_access: [
        { title: 'Reset Your Password', url: '/kb/password-reset', relevance: 0.96 },
        { title: 'Account Security', url: '/kb/security', relevance: 0.84 },
        { title: 'Two-Factor Authentication', url: '/kb/2fa', relevance: 0.79 }
      ]
    };

    return articles[intent] || [];
  }

  /**
   * Health check for Forethought service
   */
  public async healthCheck(): Promise<boolean> {
    if (this.useMockMode) {
      console.log('Forethought health check: Running in mock mode');
      return true;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 5000
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Forethought health check failed:', error);
      return false;
    }
  }

  /**
   * Get conversation history (if supported by Forethought API)
   */
  public async getConversationHistory(sessionId: string): Promise<any[]> {
    if (this.useMockMode) {
      return []; // Return empty history in mock mode
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/conversations/${sessionId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }
}