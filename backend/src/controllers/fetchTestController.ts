import { Request, Response } from 'express';
import { FetchTestRunner, FetchTestConfiguration } from '../services/fetchTestRunner';
import { FETCH_PERSONAS, FETCH_TEST_SCENARIOS } from '../config/fetchPersonas';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FetchTestController {
  private fetchTestRunner: FetchTestRunner;
  private activeTests: Map<string, any> = new Map();

  constructor() {
    this.fetchTestRunner = new FetchTestRunner();
  }

  /**
   * Start a Fetch-specific test suite
   */
  public async startFetchTest(req: Request, res: Response): Promise<void> {
    try {
      const config: FetchTestConfiguration = {
        numberOfConversations: req.body.conversationsPerCategory || 3,
        personaType: 'fetch_mixed', // Will use multiple personas
        maxTurnsPerConversation: req.body.maxTurns || 12,
        delayBetweenTurns: req.body.delayBetweenTurns || 2000,
        delayBetweenConversations: req.body.delayBetweenConversations || 3000,
        testCategories: req.body.categories || [
          'missing_points',
          'account_management',
          'fetch_play',
          'rewards_gift_cards',
          'receipt_issues',
          'ereceipt_scanning',
          'referral_issues'
        ],
        useRealWidget: req.body.useRealWidget || false,
        includeEdgeCases: req.body.includeEdgeCases || false
      };

      console.log('Starting Fetch test suite with config:', config);

      // Start test in background
      const testPromise = this.fetchTestRunner.runFetchTestSuite(config);
      const testId = `fetch_${Date.now()}`;
      
      this.activeTests.set(testId, {
        promise: testPromise,
        config,
        startTime: new Date(),
        type: 'fetch_suite'
      });

      // Clean up after completion
      testPromise.then(report => {
        console.log(`Fetch test ${testId} completed`);
        this.activeTests.delete(testId);
      }).catch(error => {
        console.error(`Fetch test ${testId} failed:`, error);
        this.activeTests.delete(testId);
      });

      res.json({
        success: true,
        message: 'Fetch test suite started',
        testId,
        config,
        estimatedDuration: this.estimateTestDuration(config)
      });

    } catch (error: any) {
      console.error('Failed to start Fetch test:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start test'
      });
    }
  }

  /**
   * Get Fetch personas
   */
  public async getFetchPersonas(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string;
      
      const personas = category ? 
        FETCH_PERSONAS.filter(p => p.category === category) :
        FETCH_PERSONAS;

      res.json({
        success: true,
        personas: personas.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          frustrationLevel: p.context.frustrationLevel,
          samplePrompts: p.initialPrompts.slice(0, 2)
        }))
      });

    } catch (error: any) {
      console.error('Failed to get personas:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get personas'
      });
    }
  }

  /**
   * Get Fetch test scenarios
   */
  public async getFetchScenarios(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        scenarios: FETCH_TEST_SCENARIOS
      });
    } catch (error: any) {
      console.error('Failed to get scenarios:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scenarios'
      });
    }
  }

  /**
   * Get Fetch categories
   */
  public async getFetchCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = [
        {
          id: 'missing_points',
          name: 'Missing Points',
          description: 'Points not credited from receipts, offers, or bonuses',
          commonIssues: ['Sign-up bonus', 'Offer points', 'Receipt points']
        },
        {
          id: 'account_management',
          name: 'Account Management',
          description: 'Login issues, profile updates, account access',
          commonIssues: ['Locked account', 'Phone change', 'Email update']
        },
        {
          id: 'fetch_play',
          name: 'Fetch Play',
          description: 'Game and app completion tracking issues',
          commonIssues: ['Game not tracked', 'Playtime missing', 'App points']
        },
        {
          id: 'rewards_gift_cards',
          name: 'Rewards & Gift Cards',
          description: 'Redemption and delivery issues',
          commonIssues: ['Delayed delivery', 'Wrong reward', 'Missing email']
        },
        {
          id: 'receipt_issues',
          name: 'Receipt Issues',
          description: 'Receipt rejection and quality problems',
          commonIssues: ['Blurry rejection', 'Invalid receipt', 'Missing items']
        },
        {
          id: 'ereceipt_scanning',
          name: 'eReceipt Scanning',
          description: 'Email connection and sync issues',
          commonIssues: ['Email not syncing', 'Missing eReceipts', 'Connection failed']
        },
        {
          id: 'referral_issues',
          name: 'Referral Issues',
          description: 'Referral credit and code problems',
          commonIssues: ['Missing referral bonus', 'Code not working', 'Friend not credited']
        }
      ];

      res.json({
        success: true,
        categories
      });

    } catch (error: any) {
      console.error('Failed to get categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get categories'
      });
    }
  }

  /**
   * Get Fetch test reports with category breakdowns
   */
  public async getFetchReports(req: Request, res: Response): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'test-reports');
      await fs.mkdir(reportPath, { recursive: true });
      
      const files = await fs.readdir(reportPath);
      const fetchReports = [];

      for (const file of files) {
        if (file.startsWith('fetch-test-') && file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
            const report = JSON.parse(content);
            
            fetchReports.push({
              filename: file,
              testId: report.testId,
              startTime: report.startTime,
              endTime: report.endTime,
              categories: (report.configuration as any).testCategories || [],
              totalConversations: report.totalConversations,
              successRate: report.successRate,
              resolutionRate: (report as any).fetchMetrics?.overallResolutionRate || 0,
              avgResponseTime: report.averageResponseTime
            });
          } catch (parseError) {
            console.error(`Failed to parse report ${file}:`, parseError);
          }
        }
      }

      res.json({
        success: true,
        reports: fetchReports.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      });

    } catch (error: any) {
      console.error('Failed to get Fetch reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reports'
      });
    }
  }

  /**
   * Get detailed Fetch report
   */
  public async getFetchReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const reportPath = path.join(process.cwd(), 'test-reports');
      
      const files = await fs.readdir(reportPath);
      const reportFile = files.find(f => f.includes(reportId));
      
      if (!reportFile) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      const content = await fs.readFile(path.join(reportPath, reportFile), 'utf-8');
      const report = JSON.parse(content);

      // Add summary statistics
      const summary = {
        totalConversations: report.totalConversations,
        successRate: report.successRate,
        resolutionRate: (report as any).fetchMetrics?.overallResolutionRate || 0,
        avgTurnsToResolution: (report as any).fetchMetrics?.averageTurnsToResolution || 0,
        categoryBreakdown: (report as any).fetchMetrics?.byCategory || {},
        topIntents: report.commonIntents?.slice(0, 10) || [],
        commonErrors: report.errorSummary?.slice(0, 5) || []
      };

      res.json({
        success: true,
        report,
        summary
      });

    } catch (error: any) {
      console.error('Failed to get Fetch report:', error);
      res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
  }

  /**
   * Estimate test duration
   */
  private estimateTestDuration(config: FetchTestConfiguration): string {
    const totalConversations = config.testCategories.length * config.numberOfConversations;
    const avgTurnTime = config.delayBetweenTurns + 500; // Processing time
    const avgConversationTime = (config.maxTurnsPerConversation / 2) * avgTurnTime;
    const totalTime = totalConversations * (avgConversationTime + config.delayBetweenConversations);
    
    const minutes = Math.ceil(totalTime / 60000);
    return `${minutes} minutes`;
  }
}