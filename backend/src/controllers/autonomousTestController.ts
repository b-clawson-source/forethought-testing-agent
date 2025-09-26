import { Request, Response } from 'express';
import { AutonomousConversationService } from '../services/autonomousConversationService';
import { AutoTestRequest, CustomerPersona, ConversationConfig } from '../types/conversation';

export class AutonomousTestController {
  private conversationService: AutonomousConversationService;
  private runningTests: Map<string, any> = new Map();

  constructor() {
    this.conversationService = new AutonomousConversationService();
  }

  /**
   * Start autonomous conversation testing
   */
  startAutonomousTest = async (req: Request, res: Response) => {
    try {
      const {
        initialPrompt,
        conversationCount = 10,
        maxTurns = 15,
        personas
      }: AutoTestRequest = req.body;

      if (!initialPrompt) {
        return res.status(400).json({
          error: 'initialPrompt is required'
        });
      }

      const testId = `auto-test-${Date.now()}`;

      // Default personas if none provided
      const defaultPersonas: CustomerPersona[] = [
        {
          type: 'frustrated',
          description: 'Frustrated customer who has been dealing with this issue for a while',
          responseStyle: 'Impatient, direct, uses phrases like "this is ridiculous" or "I need this fixed NOW"'
        },
        {
          type: 'confused',
          description: 'Customer who doesn\'t understand technical terms and needs clear explanations',
          responseStyle: 'Asks clarifying questions, says things like "I don\'t understand" or "what does that mean?"'
        },
        {
          type: 'polite',
          description: 'Courteous customer who is patient and cooperative',
          responseStyle: 'Uses please/thank you, stays calm, expresses appreciation for help'
        },
        {
          type: 'technical',
          description: 'Tech-savvy customer who understands technical details and wants specific information',
          responseStyle: 'Uses technical terminology, asks for specific details, wants root cause explanations'
        },
        {
          type: 'impatient',
          description: 'Busy customer who wants quick solutions and doesn\'t want long explanations',
          responseStyle: 'Short responses, says things like "just tell me how to fix it" or "I don\'t have time for this"'
        }
      ];

      const config: ConversationConfig = {
        maxTurns,
        conversationCount,
        customerPersonas: personas || defaultPersonas
      };

      // Start test asynchronously
      const testPromise = this.conversationService.runConversationCycles(initialPrompt, config);
      this.runningTests.set(testId, testPromise);

      res.json({
        testId,
        status: 'running',
        message: `Started autonomous test with ${conversationCount} conversations`,
        config: {
          conversationCount,
          maxTurns,
          personaCount: config.customerPersonas.length
        }
      });

      // Handle completion
      testPromise
        .then(report => {
          this.runningTests.set(testId, { status: 'completed', report });
          console.log(`✅ Test ${testId} completed successfully`);
        })
        .catch(error => {
          this.runningTests.set(testId, { status: 'failed', error: error.message });
          console.error(`❌ Test ${testId} failed:`, error);
        });

    } catch (error) {
      console.error('Error starting autonomous test:', error);
      res.status(500).json({
        error: 'Failed to start autonomous test',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get test status and results
   */
  getTestStatus = async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;

      const testData = this.runningTests.get(testId);
      if (!testData) {
        return res.status(404).json({
          error: 'Test not found'
        });
      }

      // If still running (Promise)
      if (testData instanceof Promise) {
        return res.json({
          testId,
          status: 'running',
          message: 'Test is still in progress'
        });
      }

      // If completed or failed
      return res.json({
        testId,
        status: testData.status,
        report: testData.report,
        error: testData.error
      });

    } catch (error) {
      console.error('Error getting test status:', error);
      res.status(500).json({
        error: 'Failed to get test status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get all running/completed tests
   */
  getAllTests = async (req: Request, res: Response) => {
    try {
      const tests = Array.from(this.runningTests.entries()).map(([testId, testData]) => ({
        testId,
        status: testData instanceof Promise ? 'running' : testData.status,
        startTime: testData.report?.startTime || 'Unknown',
        conversationCount: testData.report?.totalConversations || 'Unknown'
      }));

      res.json({ tests });
    } catch (error) {
      console.error('Error getting all tests:', error);
      res.status(500).json({
        error: 'Failed to get tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get conversation logs for a specific test
   */
  getConversationLogs = async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;

      const testData = this.runningTests.get(testId);
      if (!testData || testData instanceof Promise) {
        return res.status(404).json({
          error: 'Test not found or still running'
        });
      }

      if (testData.status !== 'completed') {
        return res.status(400).json({
          error: 'Test did not complete successfully'
        });
      }

      res.json({
        testId,
        conversationLogs: testData.report.conversationLogs,
        totalConversations: testData.report.conversationLogs.length
      });

    } catch (error) {
      console.error('Error getting conversation logs:', error);
      res.status(500).json({
        error: 'Failed to get conversation logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get detailed report for a specific test
   */
  getDetailedReport = async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;

      const testData = this.runningTests.get(testId);
      if (!testData || testData instanceof Promise) {
        return res.status(404).json({
          error: 'Test not found or still running'
        });
      }

      if (testData.status !== 'completed') {
        return res.status(400).json({
          error: 'Test did not complete successfully'
        });
      }

      const report = testData.report;
      
      // Generate detailed analysis
      const detailedAnalysis = {
        summary: {
          totalConversations: report.totalConversations,
          successRate: ((report.successfulConversations / report.totalConversations) * 100).toFixed(1),
          averageTurns: (report.conversationLogs.reduce((sum, log) => sum + log.turns.length, 0) / report.conversationLogs.length).toFixed(1),
          totalDuration: ((report.endTime.getTime() - report.startTime.getTime()) / 1000).toFixed(1)
        },
        personaBreakdown: this.analyzeByPersona(report.conversationLogs),
        commonPatterns: this.identifyCommonPatterns(report.conversationLogs),
        recommendations: this.generateRecommendations(report)
      };

      res.json({
        testId,
        report,
        analysis: detailedAnalysis
      });

    } catch (error) {
      console.error('Error getting detailed report:', error);
      res.status(500).json({
        error: 'Failed to get detailed report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Stop a running test
   */
  stopTest = async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;

      if (this.runningTests.has(testId)) {
        this.runningTests.delete(testId);
        res.json({
          testId,
          message: 'Test stopped successfully'
        });
      } else {
        res.status(404).json({
          error: 'Test not found'
        });
      }
    } catch (error) {
      console.error('Error stopping test:', error);
      res.status(500).json({
        error: 'Failed to stop test',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Helper methods
  private analyzeByPersona(logs: any[]) {
    const personaStats = logs.reduce((acc, log) => {
      const persona = log.persona;
      if (!acc[persona]) {
        acc[persona] = { total: 0, resolved: 0, averageTurns: 0 };
      }
      acc[persona].total++;
      if (log.resolved) acc[persona].resolved++;
      acc[persona].averageTurns += log.turns.length;
      return acc;
    }, {});

    // Calculate averages
    Object.keys(personaStats).forEach(persona => {
      personaStats[persona].averageTurns = (personaStats[persona].averageTurns / personaStats[persona].total).toFixed(1);
      personaStats[persona].successRate = ((personaStats[persona].resolved / personaStats[persona].total) * 100).toFixed(1);
    });

    return personaStats;
  }

  private identifyCommonPatterns(logs: any[]) {
    // Analyze common intents, response patterns, etc.
    const intents = new Map();
    const commonPhrases = new Map();

    logs.forEach(log => {
      log.turns.forEach((turn: any) => {
        if (turn.metadata?.intent) {
          intents.set(turn.metadata.intent, (intents.get(turn.metadata.intent) || 0) + 1);
        }
      });
    });

    return {
      topIntents: Array.from(intents.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count }))
    };
  }

  private generateRecommendations(report: any) {
    const recommendations = [];

    if (report.metrics.resolutionRate < 80) {
      recommendations.push('Consider improving knowledge base coverage - resolution rate is below 80%');
    }

    if (report.metrics.averageConfidence < 70) {
      recommendations.push('Review intent classification - average confidence is low');
    }

    const avgTurns = report.conversationLogs.reduce((sum: number, log: any) => sum + log.turns.length, 0) / report.conversationLogs.length;
    if (avgTurns > 10) {
      recommendations.push('Consider streamlining conversation flow - conversations are taking many turns');
    }

    return recommendations;
  }
}