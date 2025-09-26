import { v4 as uuidv4 } from 'uuid';
import { FetchForethoughtService } from './fetchForethoughtService';
import { LLMService } from './llmService';
import { FETCH_PERSONAS, getPersonasByCategory, FetchPersona } from '../config/fetchPersonas';
import { 
  TestConfiguration, 
  TestReport, 
  ConversationTestResult, 
  ConversationTurn 
} from '../../../shared/types/testing';

export interface FetchTestConfiguration extends TestConfiguration {
  testCategories: string[];  // Which Fetch categories to test
  useRealWidget: boolean;    // Use real Forethought widget or mock
  includeEdgeCases: boolean; // Test edge cases and error scenarios
}

export class FetchTestRunner {
  private fetchForethoughtService: FetchForethoughtService;
  private llmService: LLMService;
  private currentTestReport?: TestReport;

  constructor() {
    this.fetchForethoughtService = FetchForethoughtService.getInstance();
    this.llmService = LLMService.getInstance();
  }

  /**
   * Run comprehensive Fetch category testing
   */
  public async runFetchTestSuite(config: FetchTestConfiguration): Promise<TestReport> {
    console.log(`\n🚀 Starting Fetch Test Suite`);
    console.log(`Categories: ${config.testCategories.join(', ')}`);
    console.log(`Conversations per category: ${config.numberOfConversations}`);
    
    const testReport: TestReport = {
      testId: uuidv4(),
      startTime: new Date(),
      endTime: new Date(),
      configuration: config,
      totalConversations: 0,
      successfulConversations: 0,
      failedConversations: 0,
      successRate: 0,
      averageConversationLength: 0,
      averageResponseTime: 0,
      commonIntents: [],
      errorSummary: [],
      conversations: []
    };

    this.currentTestReport = testReport;

    // Test each category
    for (const category of config.testCategories) {
      console.log(`\n📁 Testing Category: ${category}`);
      const categoryPersonas = getPersonasByCategory(category);
      
      if (categoryPersonas.length === 0) {
        console.warn(`No personas found for category: ${category}`);
        continue;
      }

      // Run tests for this category
      for (let i = 0; i < config.numberOfConversations; i++) {
        const persona = categoryPersonas[i % categoryPersonas.length];
        console.log(`\n🧑 Testing with persona: ${persona.name}`);
        
        const result = await this.runFetchConversation(
          persona,
          config.maxTurnsPerConversation,
          config.delayBetweenTurns
        );

        testReport.conversations.push(result);
        testReport.totalConversations++;

        if (result.success) {
          testReport.successfulConversations++;
          console.log(`✅ Conversation successful`);
        } else {
          testReport.failedConversations++;
          console.log(`❌ Conversation failed: ${result.errors[0]}`);
        }

        // Wait between conversations
        if (i < config.numberOfConversations - 1) {
          await this.delay(config.delayBetweenConversations);
        }
      }
    }

    // Calculate final metrics
    testReport.endTime = new Date();
    testReport.successRate = testReport.successfulConversations / testReport.totalConversations;
    testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
    testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
    testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
    testReport.errorSummary = this.summarizeErrors(testReport.conversations);

    // Add Fetch-specific metrics
    const fetchMetrics = this.calculateFetchMetrics(testReport);
    (testReport as any).fetchMetrics = fetchMetrics;

    // Save report
    await this.saveTestReport(testReport);
    
    console.log(`\n📊 Test Suite Completed`);
    console.log(`Success Rate: ${(testReport.successRate * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${testReport.averageResponseTime.toFixed(0)}ms`);
    
    return testReport;
  }

  /**
   * Run a single Fetch conversation
   */
  private async runFetchConversation(
    persona: FetchPersona,
    maxTurns: number,
    delayBetweenTurns: number
  ): Promise<ConversationTestResult> {
    const sessionId = uuidv4();
    const result: ConversationTestResult = {
      conversationId: sessionId,
      startTime: new Date(),
      endTime: new Date(),
      totalTurns: 0,
      success: true,
      errors: [],
      metrics: {
        averageResponseTime: 0,
        intentRecognitionAccuracy: 0,
        resolutionAchieved: false
      },
      conversationLog: []
    };

    // Select initial prompt
    const initialPrompt = persona.initialPrompts[
      Math.floor(Math.random() * persona.initialPrompts.length)
    ];
    
    let currentMessage = initialPrompt;
    let conversationComplete = false;
    let turnCount = 0;
    let totalResponseTime = 0;

    console.log(`💬 Initial: "${initialPrompt.substring(0, 60)}..."`);

    while (!conversationComplete && turnCount < maxTurns) {
      const turnStartTime = Date.now();
      
      try {
        // Create user context from persona
        const userContext = {
          userId: `test_user_${persona.id}`,
          platform: 'iOS' as const,
          accountStatus: 'active'
        };

        // Query Forethought
        const forethoughtResponse = await this.fetchForethoughtService.processMessage(
          currentMessage,
          persona.category,
          userContext,
          sessionId
        );

        // Generate LLM response as the customer
        const llmResponse = await this.generateFetchCustomerResponse(
          currentMessage,
          forethoughtResponse.response,
          persona,
          result.conversationLog
        );

        const responseTime = Date.now() - turnStartTime;
        totalResponseTime += responseTime;

        // Log the turn
        const turn: ConversationTurn = {
          turnNumber: turnCount + 1,
          timestamp: new Date(),
          userMessage: currentMessage,
          forethoughtResponse: forethoughtResponse.response,
          llmResponse: llmResponse.message,
          intent: forethoughtResponse.intent,
          confidence: forethoughtResponse.confidence,
          responseTime: responseTime
        };

        result.conversationLog.push(turn);
        turnCount++;

        console.log(`   Turn ${turnCount}: ${forethoughtResponse.intent} (${forethoughtResponse.confidence.toFixed(2)})`);

        // Check if conversation should end
        conversationComplete = llmResponse.shouldEndConversation || 
                             turnCount >= maxTurns ||
                             this.isResolutionAchieved(llmResponse.message);

        if (!conversationComplete) {
          // Generate next message based on persona behavior
          currentMessage = await this.generateNextFetchMessage(persona, result.conversationLog);
          
          await this.delay(delayBetweenTurns);
        }

      } catch (error: any) {
        console.error(`Error in turn ${turnCount + 1}:`, error.message);
        result.errors.push(`Turn ${turnCount + 1}: ${error.message}`);
        result.success = false;
        conversationComplete = true;
      }
    }

    // Finalize metrics
    result.endTime = new Date();
    result.totalTurns = turnCount;
    result.metrics.averageResponseTime = turnCount > 0 ? totalResponseTime / turnCount : 0;
    result.metrics.resolutionAchieved = this.isResolutionAchieved(
      result.conversationLog[result.conversationLog.length - 1]?.llmResponse
    );
    result.metrics.intentRecognitionAccuracy = this.calculateIntentAccuracy(result.conversationLog);

    return result;
  }

  /**
   * Generate customer response based on Fetch persona
   */
  private async generateFetchCustomerResponse(
    userMessage: string,
    forethoughtResponse: string,
    persona: FetchPersona,
    history: ConversationTurn[]
  ): Promise<{ message: string; shouldEndConversation: boolean }> {
    const systemPrompt = `You are a Fetch Rewards user with these characteristics:
- ${persona.description}
- Frustration level: ${persona.context.frustrationLevel}
- Account age: ${persona.context.accountAge || 'unknown'}
- Category: ${persona.category}

Behavioral traits: ${persona.characteristics.join(', ')}
Expected behaviors: ${persona.expectedBehaviors.join('; ')}

Respond naturally to the support agent's message. If your issue is resolved, express satisfaction.
If not resolved, continue based on your persona's characteristics.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'assistant' as const, content: forethoughtResponse },
      { role: 'user' as const, content: 'How do you respond as this Fetch user?' }
    ];

    const response = await this.llmService.generateResponse({
      messages,
      config: {
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.8,
        maxTokens: 200
      }
    });

    const shouldEnd = this.checkForConversationEnd(response.message.content);

    return {
      message: response.message.content,
      shouldEndConversation: shouldEnd
    };
  }

  /**
   * Generate next message based on Fetch persona
   */
  private async generateNextFetchMessage(
    persona: FetchPersona,
    history: ConversationTurn[]
  ): Promise<string> {
    const lastTurn = history[history.length - 1];
    
    const systemPrompt = `As a ${persona.name}, continue the conversation based on the support response.
Your frustration level: ${persona.context.frustrationLevel}
Your characteristics: ${persona.characteristics.join(', ')}
Stay in character and respond naturally.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'assistant' as const, content: lastTurn.forethoughtResponse || '' },
      { role: 'user' as const, content: 'What is your follow-up question or response?' }
    ];

    const response = await this.llmService.generateResponse({
      messages,
      config: {
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.8,
        maxTokens: 150
      }
    });

    return response.message.content;
  }

  /**
   * Calculate Fetch-specific metrics
   */
  private calculateFetchMetrics(report: TestReport): any {
    const categoryMetrics: Record<string, any> = {};
    
    // Group conversations by category
    report.conversations.forEach(conv => {
      // Extract category from conversation (you'd need to track this)
      const category = this.extractCategoryFromConversation(conv);
      
      if (!categoryMetrics[category]) {
        categoryMetrics[category] = {
          total: 0,
          successful: 0,
          avgTurns: 0,
          avgResponseTime: 0,
          resolutionRate: 0,
          intents: new Map<string, number>()
        };
      }
      
      categoryMetrics[category].total++;
      if (conv.success) categoryMetrics[category].successful++;
      categoryMetrics[category].avgTurns += conv.totalTurns;
      categoryMetrics[category].avgResponseTime += conv.metrics.averageResponseTime;
      if (conv.metrics.resolutionAchieved) categoryMetrics[category].resolutionRate++;
      
      // Track intents
      conv.conversationLog.forEach(turn => {
        if (turn.intent) {
          const count = categoryMetrics[category].intents.get(turn.intent) || 0;
          categoryMetrics[category].intents.set(turn.intent, count + 1);
        }
      });
    });

    // Calculate averages
    Object.keys(categoryMetrics).forEach(category => {
      const metrics = categoryMetrics[category];
      if (metrics.total > 0) {
        metrics.avgTurns = metrics.avgTurns / metrics.total;
        metrics.avgResponseTime = metrics.avgResponseTime / metrics.total;
        metrics.resolutionRate = metrics.resolutionRate / metrics.total;
        metrics.successRate = metrics.successful / metrics.total;
        metrics.topIntents = Array.from(metrics.intents.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([intent, count]) => ({ intent, count }));
      }
    });

    return {
      byCategory: categoryMetrics,
      overallResolutionRate: this.calculateOverallResolutionRate(report),
      averageTurnsToResolution: this.calculateAvgTurnsToResolution(report),
      intentAccuracyByCategory: this.calculateIntentAccuracyByCategory(report)
    };
  }

  /**
   * Helper methods for metrics
   */
  private extractCategoryFromConversation(conv: ConversationTestResult): string {
    // Extract from first intent or default
    const firstIntent = conv.conversationLog.find(turn => turn.intent)?.intent || '';
    if (firstIntent.includes('missing_points')) return 'missing_points';
    if (firstIntent.includes('account')) return 'account_management';
    if (firstIntent.includes('fetch_play')) return 'fetch_play';
    if (firstIntent.includes('reward')) return 'rewards_gift_cards';
    if (firstIntent.includes('receipt')) return 'receipt_issues';
    if (firstIntent.includes('ereceipt')) return 'ereceipt_scanning';
    if (firstIntent.includes('referral')) return 'referral_issues';
    return 'unknown';
  }

  private calculateOverallResolutionRate(report: TestReport): number {
    const resolved = report.conversations.filter(c => c.metrics.resolutionAchieved).length;
    return report.conversations.length > 0 ? resolved / report.conversations.length : 0;
  }

  private calculateAvgTurnsToResolution(report: TestReport): number {
    const resolvedConvs = report.conversations.filter(c => c.metrics.resolutionAchieved);
    if (resolvedConvs.length === 0) return 0;
    const totalTurns = resolvedConvs.reduce((sum, c) => sum + c.totalTurns, 0);
    return totalTurns / resolvedConvs.length;
  }

  private calculateIntentAccuracyByCategory(report: TestReport): Record<string, number> {
    const accuracyByCategory: Record<string, number[]> = {};
    
    report.conversations.forEach(conv => {
      const category = this.extractCategoryFromConversation(conv);
      if (!accuracyByCategory[category]) accuracyByCategory[category] = [];
      accuracyByCategory[category].push(conv.metrics.intentRecognitionAccuracy);
    });

    const result: Record<string, number> = {};
    Object.keys(accuracyByCategory).forEach(category => {
      const accuracies = accuracyByCategory[category];
      result[category] = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    });

    return result;
  }

  /**
   * Check if conversation reached resolution
   */
  private isResolutionAchieved(lastMessage?: string): boolean {
    if (!lastMessage) return false;
    
    const resolutionPhrases = [
      'thank you',
      'thanks',
      'that helps',
      'perfect',
      'great',
      'resolved',
      'all set',
      'appreciate',
      'problem solved',
      'makes sense',
      'got it'
    ];

    const lowerMessage = lastMessage.toLowerCase();
    return resolutionPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Check for conversation end
   */
  private checkForConversationEnd(message: string): boolean {
    const endPhrases = [
      'thank you',
      'thanks',
      'goodbye',
      'bye',
      'have a nice day',
      'that\'s all',
      'all set',
      'perfect'
    ];

    const lowerMessage = message.toLowerCase();
    return endPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Calculate intent accuracy
   */
  private calculateIntentAccuracy(conversationLog: ConversationTurn[]): number {
    const turnsWithIntents = conversationLog.filter(turn => turn.intent && turn.confidence);
    if (turnsWithIntents.length === 0) return 0;
    
    const totalConfidence = turnsWithIntents.reduce((sum, turn) => sum + (turn.confidence || 0), 0);
    return totalConfidence / turnsWithIntents.length;
  }

  /**
   * Calculate average length
   */
  private calculateAverageLength(conversations: ConversationTestResult[]): number {
    if (conversations.length === 0) return 0;
    const total = conversations.reduce((sum, conv) => sum + conv.totalTurns, 0);
    return total / conversations.length;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(conversations: ConversationTestResult[]): number {
    if (conversations.length === 0) return 0;
    const total = conversations.reduce((sum, conv) => sum + conv.metrics.averageResponseTime, 0);
    return total / conversations.length;
  }

  /**
   * Extract common intents
   */
  private extractCommonIntents(conversations: ConversationTestResult[]): { intent: string; count: number }[] {
    const intentMap = new Map<string, number>();
    
    conversations.forEach(conv => {
      conv.conversationLog.forEach(turn => {
        if (turn.intent) {
          intentMap.set(turn.intent, (intentMap.get(turn.intent) || 0) + 1);
        }
      });
    });

    return Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }

  /**
   * Summarize errors
   */
  private summarizeErrors(conversations: ConversationTestResult[]): { error: string; count: number }[] {
    const errorMap = new Map<string, number>();
    
    conversations.forEach(conv => {
      conv.errors.forEach(error => {
        const simplifiedError = error.replace(/Turn \d+: /, '').substring(0, 100);
        errorMap.set(simplifiedError, (errorMap.get(simplifiedError) || 0) + 1);
      });
    });

    return Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Save test report
   */
  private async saveTestReport(report: TestReport): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportsDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `fetch-test-${report.testId}-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`📁 Report saved: ${filepath}`);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}