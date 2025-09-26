import { TestConfiguration, TestReport } from '../../../shared/types/testing';
export interface FetchTestConfiguration extends TestConfiguration {
    testCategories: string[];
    useRealWidget: boolean;
    includeEdgeCases: boolean;
}
export declare class FetchTestRunner {
    private fetchForethoughtService;
    private llmService;
    private currentTestReport?;
    constructor();
    /**
     * Run comprehensive Fetch category testing
     */
    runFetchTestSuite(config: FetchTestConfiguration): Promise<TestReport>;
    /**
     * Run a single Fetch conversation
     */
    private runFetchConversation;
    /**
     * Generate customer response based on Fetch persona
     */
    private generateFetchCustomerResponse;
    /**
     * Generate next message based on Fetch persona
     */
    private generateNextFetchMessage;
    /**
     * Calculate Fetch-specific metrics
     */
    private calculateFetchMetrics;
    /**
     * Helper methods for metrics
     */
    private extractCategoryFromConversation;
    private calculateOverallResolutionRate;
    private calculateAvgTurnsToResolution;
    private calculateIntentAccuracyByCategory;
    /**
     * Check if conversation reached resolution
     */
    private isResolutionAchieved;
    /**
     * Check for conversation end
     */
    private checkForConversationEnd;
    /**
     * Calculate intent accuracy
     */
    private calculateIntentAccuracy;
    /**
     * Calculate average length
     */
    private calculateAverageLength;
    /**
     * Calculate average response time
     */
    private calculateAverageResponseTime;
    /**
     * Extract common intents
     */
    private extractCommonIntents;
    /**
     * Summarize errors
     */
    private summarizeErrors;
    /**
     * Save test report
     */
    private saveTestReport;
    /**
     * Utility delay function
     */
    private delay;
}
//# sourceMappingURL=fetchTestRunner.d.ts.map