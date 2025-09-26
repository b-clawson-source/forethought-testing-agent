import { Request, Response } from 'express';
export declare class FetchTestController {
    private fetchTestRunner;
    private activeTests;
    constructor();
    /**
     * Start a Fetch-specific test suite
     */
    startFetchTest(req: Request, res: Response): Promise<void>;
    /**
     * Get Fetch personas
     */
    getFetchPersonas(req: Request, res: Response): Promise<void>;
    /**
     * Get Fetch test scenarios
     */
    getFetchScenarios(req: Request, res: Response): Promise<void>;
    /**
     * Get Fetch categories
     */
    getFetchCategories(req: Request, res: Response): Promise<void>;
    /**
     * Get Fetch test reports with category breakdowns
     */
    getFetchReports(req: Request, res: Response): Promise<void>;
    /**
     * Get detailed Fetch report
     */
    getFetchReport(req: Request, res: Response): Promise<void>;
    /**
     * Estimate test duration
     */
    private estimateTestDuration;
}
//# sourceMappingURL=fetchTestController.d.ts.map