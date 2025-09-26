import { Request, Response } from 'express';
export declare class TestController {
    private testRunner;
    private activeTests;
    constructor();
    /**
     * Start a new test cycle
     */
    startTestCycle(req: Request, res: Response): Promise<void>;
    /**
     * Get test status
     */
    getTestStatus(req: Request, res: Response): Promise<void>;
    /**
     * Get all test reports
     */
    getTestReports(req: Request, res: Response): Promise<void>;
    /**
     * Get specific test report
     */
    getTestReport(req: Request, res: Response): Promise<void>;
    /**
     * Get active tests
     */
    getActiveTests(req: Request, res: Response): Promise<void>;
    /**
     * Stop a running test
     */
    stopTest(req: Request, res: Response): Promise<void>;
    /**
     * Delete a test report
     */
    deleteReport(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=testController.d.ts.map