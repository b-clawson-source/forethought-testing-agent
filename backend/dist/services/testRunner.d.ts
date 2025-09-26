import { TestConfiguration, TestReport } from '../../../shared/types/testing';
export declare class AutonomousTestRunner {
    private forethoughtService;
    private llmService;
    private currentTestReport?;
    constructor();
    /**
     * Run a complete test cycle with multiple conversations
     */
    runTestCycle(config: TestConfiguration): Promise<TestReport>;
    /**
     * Run a single conversation to completion
     */
    private runSingleConversation;
    /**
     * Generate initial prompt based on persona and context
     */
    private generateInitialPrompt;
    /**
     * Check if conversation reached a resolution
     */
    private isResolutionAchieved;
    /**
     * Calculate intent recognition accuracy
     */
    private calculateIntentAccuracy;
    /**
     * Calculate average conversation length
     */
    private calculateAverageLength;
    /**
     * Calculate average response time
     */
    private calculateAverageResponseTime;
    /**
     * Extract common intents from conversations
     */
    private extractCommonIntents;
    /**
     * Summarize errors from conversations
     */
    private summarizeErrors;
    /**
     * Save test report to file
     */
    private saveTestReport;
    /**
     * Utility function to add delays
     */
    private delay;
}
//# sourceMappingURL=testRunner.d.ts.map