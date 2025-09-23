import axios, { AxiosResponse } from 'axios';
import { LoggerService } from './loggerService';

export interface ForethoughtResponse {
  response: string;
  intent: string;
  confidence: number;
  actions: string[];
  processingTime: number;
  metadata?: {
    sessionId?: string;
    userId?: string;
    contextData?: Record<string, any>;
  };
}

export interface ForethoughtConfig {
  apiKey: string;
  workspaceId: string;
  widgetUrl: string;
  timeout: number;
}

export interface ForethoughtRequestPayload {
  message: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class ForethoughtService {
  private static instance: ForethoughtService;
  private logger = LoggerService.getInstance();
  private config: ForethoughtConfig;
  private axiosInstance;

  private constructor() {
    this.config = {
      apiKey: process.env.FORETHOUGHT_API_KEY || '',
      workspaceId: process.env.FORETHOUGHT_WORKSPACE_ID || '',
      widgetUrl: process.env.FORETHOUGHT_WIDGET_URL || '',
      timeout: 30000
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Forethought-Testing-Agent/1.0.0'
      }
    });

    // Add request/response interceptors for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug('Forethought API request', {
          url: config.url,
          method: config.method,
          headers: { ...config.headers, Authorization: '[REDACTED]' }
        });
        return config;
      },
      (error) => {
        this.logger.error('Forethought API request error', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug('Forethought API response', {
          status: response.status,
          statusText: response.statusText,
          responseTime: this.getResponseTime(response)
        });
        return response;
      },
      (error) => {
        this.logger.error('Forethought API response error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ForethoughtService {
    if (!ForethoughtService.instance) {
      ForethoughtService.instance = new ForethoughtService();
    }
    return ForethoughtService.instance;
  }

  public async processMessage(
    message: string,
    sessionId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<ForethoughtResponse> {
    const startTime = Date.now();

    try {
      if (!this.config.apiKey) {
        return this.createMockResponse(message, sessionId, startTime);
      }

      const payload: ForethoughtRequestPayload = {
        message,
        sessionId,
        userId,
        metadata
      };

      // Determine the appropriate endpoint based on configuration
      const endpoint = this.determineEndpoint();
      const response = await this.axiosInstance.post(endpoint, payload);

      const processingTime = Date.now() - startTime;
      const forethoughtResponse = this.parseForethoughtResponse(response, processingTime);

      // Log the successful request
      this.logger.logForethoughtRequest(
        sessionId || 'unknown',
        forethoughtResponse.intent,
        forethoughtResponse.confidence,
        processingTime
      );

      return forethoughtResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Forethought API call failed', {
        sessionId,
        message: message.substring(0, 100) + '...',
        processingTime,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return fallback response instead of throwing
      return this.createFallbackResponse(message, sessionId, processingTime, error);
    }
  }

  private determineEndpoint(): string {
    // If widget URL is provided, use widget endpoint
    if (this.config.widgetUrl) {
      return `${this.config.widgetUrl}/api/message`;
    }

    // Otherwise use standard API endpoint
    return `https://api.forethought.ai/v1/workspaces/${this.config.workspaceId}/conversations/message`;
  }

  private parseForethoughtResponse(response: AxiosResponse, processingTime: number): ForethoughtResponse {
    const data = response.data;

    // Handle different response formats from Forethought
    let parsedResponse: ForethoughtResponse;

    if (data.response || data.message) {
      // Standard API response format
      parsedResponse = {
        response: data.response || data.message || 'I understand your message.',
        intent: data.intent || data.detected_intent || 'general_inquiry',
        confidence: data.confidence || data.intent_confidence || 0.8,
        actions: data.actions || data.triggered_actions || [],
        processingTime,
        metadata: {
          sessionId: data.session_id,
          userId: data.user_id,
          contextData: data.context || {}
        }
      };
    } else if (data.choices && data.choices.length > 0) {
      // OpenAI-like response format (if Forethought uses similar structure)
      const choice = data.choices[0];
      parsedResponse = {
        response: choice.message?.content || choice.text || 'I understand your message.',
        intent: choice.intent || 'general_inquiry',
        confidence: choice.confidence || 0.8,
        actions: choice.actions || [],
        processingTime,
        metadata: data.metadata || {}
      };
    } else {
      // Fallback parsing
      parsedResponse = {
        response: JSON.stringify(data).substring(0, 200) + '...',
        intent: 'unknown',
        confidence: 0.5,
        actions: [],
        processingTime
      };
    }

    return parsedResponse;
  }

  private createMockResponse(message: string, sessionId?: string, startTime?: number): ForethoughtResponse {
    // Create realistic mock responses for testing when API is not configured
    const mockIntents = [
      { intent: 'billing_inquiry', confidence: 0.9, response: "I can help you with billing questions. What specific billing issue are you experiencing?" },
      { intent: 'technical_support', confidence: 0.85, response: "I'll help you resolve this technical issue. Can you provide more details about what you're experiencing?" },
      { intent: 'account_access', confidence: 0.8, response: "I can assist with account access issues. Are you having trouble logging in?" },
      { intent: 'product_question', confidence: 0.75, response: "I'd be happy to answer questions about our products. What would you like to know?" },
      { intent: 'general_inquiry', confidence: 0.7, response: "Thank you for your message. How can I assist you today?" }
    ];

    // Simple intent detection based on keywords
    const lowerMessage = message.toLowerCase();
    let selectedMock = mockIntents[4]; // default to general_inquiry

    if (lowerMessage.includes('bill') || lowerMessage.includes('payment') || lowerMessage.includes('charge')) {
      selectedMock = mockIntents[0];
    } else if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('not working')) {
      selectedMock = mockIntents[1];
    } else if (lowerMessage.includes('login') || lowerMessage.includes('password') || lowerMessage.includes('account')) {
      selectedMock = mockIntents[2];
    } else if (lowerMessage.includes('product') || lowerMessage.includes('feature') || lowerMessage.includes('how')) {
      selectedMock = mockIntents[3];
    }

    // Mock some actions based on intent
    const mockActions = [];
    if (selectedMock.intent === 'billing_inquiry') {
      mockActions.push('retrieve_billing_info', 'escalate_to_billing_team');
    } else if (selectedMock.intent === 'technical_support') {
      mockActions.push('create_support_ticket', 'gather_system_info');
    } else if (selectedMock.intent === 'account_access') {
      mockActions.push('initiate_password_reset', 'verify_identity');
    }

    const processingTime = startTime ? Date.now() - startTime : Math.random() * 1000 + 500;

    return {
      response: selectedMock.response,
      intent: selectedMock.intent,
      confidence: selectedMock.confidence + (Math.random() * 0.1 - 0.05), // Add some variance
      actions: mockActions,
      processingTime: Math.round(processingTime),
      metadata: {
        sessionId,
        contextData: {
          mock: true,
          originalMessage: message.substring(0, 50)
        }
      }
    };
  }

  private createFallbackResponse(
    message: string, 
    sessionId?: string, 
    processingTime?: number,
    error?: any
  ): ForethoughtResponse {
    return {
      response: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or contact support if the issue persists.",
      intent: 'system_error',
      confidence: 0.0,
      actions: ['log_error', 'escalate_to_human'],
      processingTime: processingTime || 0,
      metadata: {
        sessionId,
        contextData: {
          error: true,
          errorMessage: error instanceof Error ? error.message : String(error),
          fallback: true
        }
      }
    };
  }

  private getResponseTime(response: AxiosResponse): number {
    const requestTime = response.config.metadata?.startTime;
    return requestTime ? Date.now() - requestTime : 0;
  }

  public async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        this.logger.warn('Forethought API key not configured, using mock responses');
        return false;
      }

      // Test the connection with a simple health check or ping
      const response = await this.axiosInstance.get('/health', { timeout: 5000 });
      return response.status === 200;

    } catch (error) {
      this.logger.error('Forethought configuration validation failed', error);
      return false;
    }
  }

  public updateConfiguration(newConfig: Partial<ForethoughtConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance headers if API key changed
    if (newConfig.apiKey) {
      this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }

    this.logger.info('Forethought configuration updated');
  }

  public getConfiguration(): Omit<ForethoughtConfig, 'apiKey'> {
    const { apiKey, ...config } = this.config;
    return {
      ...config,
      apiKey: apiKey ? '[CONFIGURED]' : '[NOT CONFIGURED]'
    } as Omit<ForethoughtConfig, 'apiKey'>;
  }

  // Method to simulate widget interaction for testing
  public async simulateWidgetInteraction(
    message: string,
    widgetConfig?: Record<string, any>
  ): Promise<ForethoughtResponse> {
    // This method can be used to test widget-specific behavior
    const sessionId = `widget-test-${Date.now()}`;
    
    return this.processMessage(message, sessionId, 'test-user', {
      widget: true,
      widgetConfig,
      simulatedInteraction: true
    });
  }

  // Analytics methods
  public async getConversationAnalytics(sessionId: string): Promise<any> {
    try {
      if (!this.config.apiKey) {
        return { error: 'API key not configured' };
      }

      const response = await this.axiosInstance.get(`/analytics/conversations/${sessionId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch conversation analytics', error);
      return { error: 'Failed to fetch analytics' };
    }
  }
}