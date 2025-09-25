import { Request, Response } from 'express';
import { AutonomousTestRunner } from '../services/testRunner';
import { TestConfiguration } from '../../../shared/types/testing';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TestController {
  private testRunner: AutonomousTestRunner;
  private activeTests: Map<string, any> = new Map();

  constructor() {
    this.testRunner = new AutonomousTestRunner();
  }

  /**
   * Start a new test cycle
   */
  public async startTestCycle(req: Request, res: Response): Promise<void> {
    try {
      const config: TestConfiguration = {
        numberOfConversations: req.body.numberOfConversations || 10,
        personaType: req.body.personaType || 'frustrated_customer',
        maxTurnsPerConversation: req.body.maxTurnsPerConversation || 15,
        delayBetweenTurns: req.body.delayBetweenTurns || 2000,
        delayBetweenConversations: req.body.delayBetweenConversations || 5000
      };

      console.log('Starting test cycle with config:', config);

      // Start test in background
      const testPromise = this.testRunner.runTestCycle(config);
      
      // Generate test ID
      const testId = Date.now().toString();
      
      // Store the promise so we can check status
      this.activeTests.set(testId, {
        promise: testPromise,
        config,
        startTime: new Date()
      });

      // Clean up after completion
      testPromise.then(report => {
        console.log(`Test ${testId} completed successfully`);
        this.activeTests.delete(testId);
      }).catch(error => {
        console.error(`Test ${testId} failed:`, error);
        this.activeTests.delete(testId);
      });

      res.json({
        success: true,
        message: 'Test cycle started',
        testId,
        config
      });

    } catch (error: any) {
      console.error('Failed to start test cycle:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start test cycle'
      });
    }
  }

  /**
   * Get test status
   */
  public async getTestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      
      const activeTest = this.activeTests.get(testId);
      
      if (activeTest) {
        res.json({
          success: true,
          status: 'running',
          testId,
          config: activeTest.config,
          startTime: activeTest.startTime
        });
      } else {
        // Check if test report exists
        const reportPath = path.join(process.cwd(), 'test-reports');
        
        try {
          const files = await fs.readdir(reportPath);
          const testReport = files.find(f => f.includes(testId));
          
          if (testReport) {
            res.json({
              success: true,
              status: 'completed',
              testId,
              reportFile: testReport
            });
          } else {
            res.status(404).json({
              success: false,
              error: 'Test not found'
            });
          }
        } catch (err) {
          res.status(404).json({
            success: false,
            error: 'Test not found'
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to get test status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get test status'
      });
    }
  }

  /**
   * Get all test reports
   */
  public async getTestReports(req: Request, res: Response): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'test-reports');
      
      // Ensure directory exists
      await fs.mkdir(reportPath, { recursive: true });
      
      const files = await fs.readdir(reportPath);
      const reports = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
            const report = JSON.parse(content);
            reports.push({
              filename: file,
              testId: report.testId,
              startTime: report.startTime,
              endTime: report.endTime,
              successRate: report.successRate,
              totalConversations: report.totalConversations,
              personaType: report.configuration?.personaType
            });
          } catch (parseError) {
            console.error(`Failed to parse report ${file}:`, parseError);
          }
        }
      }

      res.json({
        success: true,
        reports: reports.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      });

    } catch (error: any) {
      console.error('Failed to get test reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get test reports'
      });
    }
  }

  /**
   * Get specific test report
   */
  public async getTestReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const reportPath = path.join(process.cwd(), 'test-reports');
      
      // Try to find the report file
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

      res.json({
        success: true,
        report
      });

    } catch (error: any) {
      console.error('Failed to get test report:', error);
      res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
  }

  /**
   * Get active tests
   */
  public async getActiveTests(req: Request, res: Response): Promise<void> {
    try {
      const activeTests = Array.from(this.activeTests.entries()).map(([id, test]) => ({
        testId: id,
        config: test.config,
        startTime: test.startTime,
        status: 'running'
      }));

      res.json({
        success: true,
        activeTests
      });

    } catch (error: any) {
      console.error('Failed to get active tests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active tests'
      });
    }
  }

  /**
   * Stop a running test
   */
  public async stopTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      
      const activeTest = this.activeTests.get(testId);
      
      if (!activeTest) {
        return res.status(404).json({
          success: false,
          error: 'Test not found or already completed'
        });
      }

      // Note: In a real implementation, you'd need a way to cancel the promise
      // For now, we'll just remove it from active tests
      this.activeTests.delete(testId);

      res.json({
        success: true,
        message: `Test ${testId} stopped`
      });

    } catch (error: any) {
      console.error('Failed to stop test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop test'
      });
    }
  }

  /**
   * Delete a test report
   */
  public async deleteReport(req: Request, res: Response): Promise<void> {
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
      
      await fs.unlink(path.join(reportPath, reportFile));

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });

    } catch (error: any) {
      console.error('Failed to delete report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete report'
      });
    }
  }
}