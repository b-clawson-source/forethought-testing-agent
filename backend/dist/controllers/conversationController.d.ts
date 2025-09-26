import { Request, Response } from 'express';
export declare class ConversationController {
    /**
     * Handle message in conversation - THIS IS THE KEY ENDPOINT TO FIX
     */
    static sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Start freeform conversation with OpenAI customer simulation
     */
    static startFreeformConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Generate customer response using OpenAI
     */
    static generateCustomerResponse(messages: any[], persona: string, lastAgentResponse: string): Promise<string>;
    /**
     * Determine if conversation should end
     */
    static shouldEndConversation(messages: any[], persona: string): Promise<{
        shouldEnd: boolean;
        resolved: boolean;
        reason: string;
    }>;
    /**
     * Get conversation by session ID
     */
    static getConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all conversations
     */
    static getConversations(req: Request, res: Response): Promise<void>;
    /**
     * Test Forethought connectivity
     */
    static testForethought(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=conversationController.d.ts.map