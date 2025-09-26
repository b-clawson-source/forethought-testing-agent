import { ConversationLog, TestReport } from '../types/conversation';
interface ConversationConfig {
    maxTurns: number;
    conversationCount: number;
    customerPersonas: CustomerPersona[];
}
interface CustomerPersona {
    type: 'frustrated' | 'confused' | 'technical' | 'polite' | 'impatient';
    description: string;
    responseStyle: string;
}
export declare class AutonomousConversationService {
    private openai;
    private forethoughtService;
    private conversationLogs;
    constructor();
    /**
     * Run autonomous conversation cycles
     */
    runConversationCycles(initialPrompt: string, config: ConversationConfig): Promise<TestReport>;
    /**
     * Run a single autonomous conversation
     */
    private runSingleConversation;
    /**
     * Get response from Forethought widget
     */
    private getForethoughtResponse;
    /**
     * Generate customer response using OpenAI
     */
    private generateCustomerResponse;
    /**
     * Generate conversation scenarios based on initial prompt
     */
    private generateConversationScenarios;
    /**
     * Determine if conversation should end
     */
    private shouldEndConversation;
    /**
     * Calculate comprehensive metrics
     */
    private calculateMetrics;
    private calculateAverageResponseTime;
    private sleep;
    /**
     * Get conversation log by ID
     */
    getConversationLog(id: string): ConversationLog | undefined;
    /**
     * Get all conversation logs
     */
    getAllConversationLogs(): ConversationLog[];
}
export {};
//# sourceMappingURL=autonomousConversationService.d.ts.map