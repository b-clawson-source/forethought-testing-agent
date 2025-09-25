import axios from 'axios';
import { ForethoughtResponse } from './forethoughtService';

export interface FetchUserContext {
  userId?: string;
  email?: string;
  phone?: string;
  accountStatus?: string;
  receiptId?: string;
  transactionId?: string;
  ticketId?: string;
  offerCategory?: string;
  storeName?: string;
  receiptTotal?: string;
  pointsExpected?: number;
  pointsReceived?: number;
  referralCode?: string;
  gameId?: string;
  platform?: 'iOS' | 'Android' | 'Web';
}

export class FetchForethoughtService {
  private static instance: FetchForethoughtService;
  private widgetApiKey: string = 'f633608a-e999-442a-8f94-312ec5ff33ae';
  private widgetUrl: string = 'https://solve-widget.forethought.ai';
  
  private constructor() {}

  public static getInstance(): FetchForethoughtService {
    if (!FetchForethoughtService.instance) {
      FetchForethoughtService.instance = new FetchForethoughtService();
    }
    return FetchForethoughtService.instance;
  }

  /**
   * Process message through Forethought widget with Fetch-specific context
   */
  public async processMessage(
    message: string,
    category: string,
    userContext: FetchUserContext,
    sessionId: string
  ): Promise<ForethoughtResponse> {
    const startTime = Date.now();
    
    try {
      // Build Fetch-specific data attributes
      const fetchData = this.buildFetchDataAttributes(category, userContext);
      
      // Call Forethought widget API
      const response = await axios.post(
        `${this.widgetUrl}/api/v1/conversations`,
        {
          message,
          api_key: this.widgetApiKey,
          session_id: sessionId,
          ...fetchData
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return this.parseResponse(response.data, Date.now() - startTime);
      
    } catch (error) {
      console.error('Forethought widget error, using category-specific fallback:', error);
      return this.generateCategoryResponse(message, category, userContext, Date.now() - startTime);
    }
  }

  /**
   * Build Fetch-specific data attributes for Forethought
   */
  private buildFetchDataAttributes(category: string, context: FetchUserContext): Record<string, string> {
    const data: Record<string, string> = {
      'data-ft-Intent-Category': this.mapCategoryToIntent(category),
      'data-ft-ContactEntryPoint': 'Testing Agent',
      'data-ft-Language': 'English',
      'data-ft-Mobile-Platform': context.platform || 'Web'
    };

    // Add context-specific data
    if (context.userId) data['data-ft-UserId'] = context.userId;
    if (context.email) data['data-ft-Email'] = context.email;
    if (context.phone) data['data-ft-Phone'] = context.phone;
    if (context.receiptId) data['data-ft-ReceiptID'] = context.receiptId;
    if (context.transactionId) data['data-ft-TransactionId'] = context.transactionId;
    if (context.ticketId) data['data-ft-Ticket-ID'] = context.ticketId;
    if (context.storeName) data['data-ft-Store-Name'] = context.storeName;
    if (context.receiptTotal) data['data-ft-Receipt-Total'] = context.receiptTotal;
    if (context.referralCode) data['data-ft-Referral-Code'] = context.referralCode;
    if (context.offerCategory) data['data-ft-OfferCategory'] = context.offerCategory;

    return data;
  }

  /**
   * Map our categories to Forethought Intent Categories
   */
  private mapCategoryToIntent(category: string): string {
    const mapping: Record<string, string> = {
      'missing_points': 'Missing Points / Offers',
      'account_management': 'Account',
      'fetch_play': 'Fetch Play',
      'rewards_gift_cards': 'Rewards',
      'receipt_issues': 'Rejected Receipt',
      'ereceipt_scanning': 'eReceipts',
      'referral_issues': 'Referrals'
    };
    return mapping[category] || 'Account';
  }

  /**
   * Generate category-specific responses for testing
   */
  private generateCategoryResponse(
    message: string,
    category: string,
    context: FetchUserContext,
    processingTime: number
  ): ForethoughtResponse {
    const lowerMessage = message.toLowerCase();
    
    const categoryResponses: Record<string, any> = {
      'missing_points': {
        intent: 'missing_points_receipts',
        confidence: 0.91,
        response: "I can help you with your missing points. Let me check your receipt details. Can you provide the receipt ID or store name and date of purchase?",
        actions: ['check_receipt_status', 'calculate_expected_points', 'review_offer_eligibility'],
        workflowTag: 'missing_points'
      },
      'account_management': {
        intent: 'account_help',
        confidence: 0.88,
        response: "I'll assist you with your account. What specific account issue are you experiencing? I can help with login issues, profile updates, or account settings.",
        actions: ['verify_account_status', 'check_security_settings', 'update_profile'],
        workflowTag: 'account'
      },
      'fetch_play': {
        intent: 'fetch_play_missing_points',
        confidence: 0.89,
        response: "I understand you have a question about Fetch Play. Are you missing points from a game or app, or do you need help with a specific game task?",
        actions: ['check_game_completion', 'verify_playtime', 'calculate_play_points'],
        workflowTag: 'fetch_play'
      },
      'rewards_gift_cards': {
        intent: 'rewards_redemption',
        confidence: 0.92,
        response: "I can help with rewards and gift cards. Are you trying to redeem points, or is there an issue with a reward you've already claimed?",
        actions: ['check_points_balance', 'verify_redemption_status', 'process_reward'],
        workflowTag: 'rewards'
      },
      'receipt_issues': {
        intent: 'rejected_receipt_help',
        confidence: 0.90,
        response: "I see you're having trouble with a receipt. Was your receipt rejected, or are you experiencing another issue? I can help troubleshoot the problem.",
        actions: ['review_rejection_reason', 'provide_receipt_guidelines', 'manual_review_request'],
        workflowTag: 'rejected_receipt'
      },
      'ereceipt_scanning': {
        intent: 'ereceipt_connection_help',
        confidence: 0.87,
        response: "I'll help you with eReceipt scanning. Are you having trouble connecting your email, or are certain eReceipts not appearing in your account?",
        actions: ['verify_email_connection', 'check_sync_status', 'troubleshoot_missing_ereceipts'],
        workflowTag: 'ereceipts'
      },
      'referral_issues': {
        intent: 'referrals_missing_bonus',
        confidence: 0.86,
        response: "I can help with your referral issue. Are you missing referral points, or is there a problem with your referral code?",
        actions: ['verify_referral_status', 'check_referral_requirements', 'calculate_referral_bonus'],
        workflowTag: 'referrals'
      }
    };

    const response = categoryResponses[category] || categoryResponses['account_management'];
    
    // Enhance response based on specific keywords
    if (lowerMessage.includes('points') && lowerMessage.includes('missing')) {
      response.confidence = Math.min(0.99, response.confidence + 0.05);
    }
    
    return {
      response: response.response,
      intent: response.intent,
      confidence: response.confidence,
      actions: response.actions,
      processingTime: processingTime,
      metadata: {
        sessionId: `session_${Date.now()}`,
        workflowTag: response.workflowTag
      }
    };
  }

  /**
   * Parse Forethought widget response
   */
  private parseResponse(data: any, processingTime: number): ForethoughtResponse {
    return {
      response: data.message || data.response || 'How can I help you today?',
      intent: data.intent || 'unknown',
      confidence: data.confidence || 0.5,
      actions: data.actions || [],
      processingTime: processingTime,
      metadata: {
        workflowTag: data.workflow_tag,
        sessionId: data.session_id
      }
    };
  }
}