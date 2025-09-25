import { v4 as uuidv4 } from 'uuid';
import { ForethoughtService } from './forethoughtService';
import { LLMService } from './llmService';
import { 
  TestConfiguration, 
  TestReport, 
  ConversationTestResult, 
  ConversationTurn 
} from '../../../shared/types/testing';

export class AutonomousTestRunner {
  private forethoughtService: ForethoughtService;
  private llmService: LLMService;
  private currentTestReport?: TestReport;

  constructor() {
    this.forethoughtService = ForethoughtService.getInstance();
    this.llmService = LLMService.getInstance();
  }

  /**
   * Run a complete test cycle with multiple conversations
   */
  async runTestCycle(config: TestConfiguration): Promise<TestReport> {
    console.log(`Starting test cycle with ${config.numberOfConversations} conversations`);
    
    const testReport: TestReport = {
      testId: uuidv4(),
      startTime: new Date(),
      endTime: new Date(),
      configuration: config,
      totalConversations: config.numberOfConversations,
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

    // Run conversations sequentially
    for (let i = 0; i < config.numberOfConversations; i++) {
      console.log(`\nStarting conversation ${i + 1}/${config.numberOfConversations}`);
      
      // Generate initial prompt based on previous context
      const initialPrompt = await this.generateInitialPrompt(
        config.personaType,
        i > 0 ? testReport.conversations[i - 1] : undefined
      );

      // Run single conversation
      const result = await this.runSingleConversation(
        initialPrompt,
        config.personaType,
        config.maxTurnsPerConversation,
        config.delayBetweenTurns
      );

      testReport.conversations.push(result);

      if (result.success) {
        testReport.successfulConversations++;
      } else {
        testReport.failedConversations++;
      }

      // Wait between conversations
      if (i < config.numberOfConversations - 1) {
        await this.delay(config.delayBetweenConversations);
      }
    }

    // Calculate final metrics
    testReport.endTime = new Date();
    testReport.successRate = testReport.successfulConversations / testReport.totalConversations;
    testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
    testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
    testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
    testReport.errorSummary = this.summarizeErrors(testReport.conversations);

    // Generate and save report
    await this.saveTestReport(testReport);
    
    console.log(`\nTest cycle completed. Success rate: ${(testReport.successRate * 100).toFixed(2)}%`);
    
    return testReport;
  }

  /**
   * Run a single conversation to completion
   */
  private async runSingleConversation(
    initialPrompt: string,
    personaType: string,
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

    let currentMessage = initialPrompt;
    let conversationComplete = false;
    let turnCount = 0;
    let totalResponseTime = 0;

    while (!conversationComplete && turnCount < maxTurns) {
      const turnStartTime = Date.now();
      
      try {
        // Query Forethought
        const forethoughtResponse = await this.forethoughtService.processMessage(
          currentMessage,
          sessionId
        );

        // Generate LLM response based on Forethought's answer
        const llmResponse = await this.llmService.generateTestResponse(
          currentMessage,
          forethoughtResponse.response,
          personaType,
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

        console.log(`Turn ${turnCount}: Intent=${forethoughtResponse.intent}, Confidence=${forethoughtResponse.confidence.toFixed(2)}`);

        // Check if conversation should end
        conversationComplete = llmResponse.shouldEndConversation || 
                             turnCount >= maxTurns ||
                             this.isResolutionAchieved(llmResponse.message);

        if (!conversationComplete) {
          // Generate next user message
          currentMessage = await this.llmService.generateNextUserMessage(
            personaType,
            result.conversationLog
          );
          
          await this.delay(delayBetweenTurns);
        }

      } catch (error: any) {
        console.error(`Error in turn ${turnCount + 1}:`, error);
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
   * Generate initial prompt based on persona and context
   */
  private async generateInitialPrompt(
    personaType: string,
    previousConversation?: ConversationTestResult
  ): Promise<string> {
    const context = previousConversation ? 
      `Previous conversation ended with: ${
        previousConversation.conversationLog[
          previousConversation.conversationLog.length - 1
        ]?.llmResponse || 'no previous context'
      }` : '';

    return this.llmService.generateInitialPrompt(personaType, context);
  }

  /**
   * Check if conversation reached a resolution
   */
  private isResolutionAchieved(lastMessage?: string): boolean {
    if (!lastMessage) return false;
    
    const resolutionPhrases = [
      'resolved',
      'thank you',
      'thanks',
      'that helps',
      'problem solved',
      'issue fixed',
      'goodbye',
      'bye',
      'have a nice day',
      'appreciate',
      'perfect',
      'all set'
    ];

    const lowerMessage = lastMessage.toLowerCase();
    return resolutionPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Calculate intent recognition accuracy
   */
  private calculateIntentAccuracy(conversationLog: ConversationTurn[]): number {
    const turnsWithIntents = conversationLog.filter(turn => turn.intent && turn.confidence);
    if (turnsWithIntents.length === 0) return 0;
    
    const totalConfidence = turnsWithIntents.reduce((sum, turn) => sum + (turn.confidence || 0), 0);
    return totalConfidence / turnsWithIntents.length;
  }

  /**
   * Calculate average conversation length
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
   * Extract common intents from conversations
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
      .slice(0, 10); // Top 10 intents
  }

  /**
   * Summarize errors from conversations
   */
  private summarizeErrors(conversations: ConversationTestResult[]): { error: string; count: number }[] {
    const errorMap = new Map<string, number>();
    
    conversations.forEach(conv => {
      conv.errors.forEach(error => {
        // Simplify error message for grouping
        const simplifiedError = error.replace(/Turn \d+: /, '').substring(0, 100);
        errorMap.set(simplifiedError, (errorMap.get(simplifiedError) || 0) + 1);
      });
    });

    return Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Save test report to file
   */
  private async saveTestReport(report: TestReport): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportsDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `test-report-${report.testId}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`Test report saved to: ${filepath}`);
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}