import { ConversationSession, ConversationConfig, PersonaType } from '../../shared/types/conversation';
export declare class ConversationEngine {
    private static instance;
    private llmService;
    private forethoughtService;
    private activeSessions;
    private constructor();
    static getInstance(): ConversationEngine;
    startConversation(initialPrompt: string, persona: PersonaType, config?: Partial<ConversationConfig>): Promise<ConversationSession>;
    private generateInitialUserMessage;
    private processNextTurn;
    getAllSessions(limit?: number): Promise<ConversationSession[]>;
}
//# sourceMappingURL=conversationEngine.d.ts.map