import { Request, Response } from 'express';
import { AutonomousTestRunner } from '../services/testRunner';
import { TestConfiguration } from '../../../shared/types/testing'; // <-- fixed path
import * as fs from 'fs/promises';
import * as path from 'path';

export class TestController {
  private testRunner: AutonomousTestRunner;
  private activeTests: Map<string, any> = new Map();

  constructor() {
    this.testRunner = new AutonomousTestRunner();
  }

  /** Start a new test cycle (background) */
  public async startTestCycle(req: Request, res: Response): Promise<void> {
    try {
      const config: TestConfiguration = {
        numberOfConversations: req.body.numberOfConversations ?? 10,
        // default to a Tier-1 persona so we hit the Forethought runner codepath
        personaType: (req.body.personaType as any) ?? 'Missing Points',
        maxTurnsPerConversation: req.body.maxTurnsPerConversation ?? 15,
        delayBetweenTurns: req.body.delayBetweenTurns ?? 2000,
        delayBetweenConversations: req.body.delayBetweenConversations ?? 5000
      };

      const testPromise = this.testRunner.runTestCycle(config);

      const testId = Date.now().toString();
      this.activeTests.set(testId, {
        promise: testPromise,
        config,
        startTime: new Date()
      });

      testPromise
        .then(() => this.activeTests.delete(testId))
        .catch(error => {
          console.error(`Test ${testId} failed:`, error);
          this.activeTests.delete(testId);
        });

      res.json({
        success: true,
        message: 'Test cycle started',
        testId,
        config
      });
    } catch (error) {
      console.error('Failed to start test cycle:', error);
      res.status(500).json({ success: false, error: 'Failed to start test cycle' });
    }
  }

  /** Run a single test immediately (used by /api/tests/run-once) */
  public async runAdHocSingle(config: TestConfiguration) {
    const cfg: TestConfiguration = {
      numberOfConversations: config.numberOfConversations ?? 1,
      personaType: (config.personaType as any) ?? 'Missing Points',
      maxTurnsPerConversation: config.maxTurnsPerConversation ?? 8,
      delayBetweenTurns: config.delayBetweenTurns ?? 1200,
      delayBetweenConversations: 0
    };
    return this.testRunner.runTestCycle(cfg);
  }

  /** Get test status */
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
        return;
      }

      const reportPath = path.join(process.cwd(), 'test-reports');
      await fs.mkdir(reportPath, { recursive: true });
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
        res.status(404).json({ success: false, error: 'Test not found' });
      }
    } catch (error) {
      console.error('Failed to get test status:', error);
      res.status(500).json({ success: false, error: 'Failed to get test status' });
    }
  }

  /** List all test reports (summaries) */
  public async getTestReports(_req: Request, res: Response): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'test-reports');
      await fs.mkdir(reportPath, { recursive: true });

      const files = await fs.readdir(reportPath);
      const reports = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
        const report = JSON.parse(content);
        reports.push({
          filename: file,
          testId: report.testId,
          startTime: report.startTime,
          endTime: report.endTime,
          successRate: report.successRate,
          totalConversations: report.totalConversations
        });
      }

      res.json({
        success: true,
        reports: reports.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      });
    } catch (error) {
      console.error('Failed to get test reports:', error);
      res.status(500).json({ success: false, error: 'Failed to get test reports' });
    }
  }

  /** Get a single test report (full) */
  public async getTestReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const reportPath = path.join(process.cwd(), 'test-reports', `${reportId}.json`);
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);

      res.json({ success: true, report });
    } catch (error) {
      console.error('Failed to get test report:', error);
      res.status(404).json({ success: false, error: 'Report not found' });
    }
  }

  /** Enumerate currently active tests */
  public async getActiveTests(_req: Request, res: Response): Promise<void> {
    try {
      const activeTests = Array.from(this.activeTests.entries()).map(([id, test]) => ({
        testId: id,
        config: test.config,
        startTime: test.startTime,
        status: 'running'
      }));

      res.json({ success: true, activeTests });
    } catch (error) {
      console.error('Failed to get active tests:', error);
      res.status(500).json({ success: false, error: 'Failed to get active tests' });
    }
  }
}