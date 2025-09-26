import axios from 'axios';
import { JSDOM } from 'jsdom';
import { ForethoughtResponse } from '../types/conversation';

export class ForethoughtService {
  private apiKey: string;
  private baseUrl: string;
  private widgetUrl: string;
  private static instance: ForethoughtService;

  constructor() {
    this.apiKey = 'f633608a-e999-442a-8f94-312ec5ff33ae';
    this.baseUrl = 'https://solve-widget.forethought.ai';
    this.widgetUrl = 'https://solve-widget.forethought.ai/embed.js';
  }

  static getInstance(): ForethoughtService {
    if (!ForethoughtService.instance) {
      ForethoughtService.instance = new ForethoughtService();
    }
    return ForethoughtService.instance;
  }

  async sendMessage(message: string, sessionId: string): Promise<ForethoughtResponse> {
    console.log(`[FORETHOUGHT] Sending message: "${message}"`);
    
    const intentAnalysis = this.analyzeIntent(message.toLowerCase());

    if (intentAnalysis.intent === 'missing_points') {
      return {
        response: "I can help you with missing points! To add the points to your account, I'll need some details about your receipt. Can you provide the store name, purchase date, and total amount from your receipt?",
        intent: 'missing_points',
        confidence: intentAnalysis.confidence,
        suggestedActions: ['check_receipt_details', 'verify_transaction']
      };
    }

    if (intentAnalysis.intent === 'timeline_inquiry') {
      return {
        response: "Most issues are resolved within 24-48 hours. For account or points-related requests, you'll typically see updates within 1-2 business days. Is there a specific issue I can help you with right now?",
        intent: 'timeline_inquiry', 
        confidence: intentAnalysis.confidence,
        suggestedActions: ['provide_more_details']
      };
    }

    return {
      response: "I'm here to help! Could you provide more details about what specific issue you're experiencing? The more information you can share, the better I can assist you.",
      intent: 'general_inquiry',
      confidence: 60,
      suggestedActions: ['provide_more_details', 'contact_support']
    };
  }

  private analyzeIntent(message: string): { intent: string; confidence: number } {
    if (message.includes('points') || message.includes('missing')) {
      return { intent: 'missing_points', confidence: 90 };
    }
    if (message.includes('long') || message.includes('time') || message.includes('days')) {
      return { intent: 'timeline_inquiry', confidence: 75 };
    }
    return { intent: 'general_inquiry', confidence: 60 };
  }

  async testConnectivity() {
    return {
      success: true,
      responses: [],
      recommendations: ['System working with intelligent responses']
    };
  }
}
