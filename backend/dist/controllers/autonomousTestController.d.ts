import { Request, Response } from 'express';
export declare class AutonomousTestController {
    private conversationService;
    private runningTests;
    constructor();
    /**
     * Start autonomous conversation testing
     */
    startAutonomousTest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get test status and results
     */
    getTestStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all running/completed tests
     */
    getAllTests: (req: Request, res: Response) => Promise<void>;
    /**
     * Get conversation logs for a specific test
     */
    getConversationLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get detailed report for a specific test
     */
    getDetailedReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Stop a running test
     */
    stopTest: (req: Request, res: Response) => Promise<void>;
    private analyzeByPersona;
    private identifyCommonPatterns;
    private generateRecommendations;
}
//# sourceMappingURL=autonomousTestController.d.ts.map