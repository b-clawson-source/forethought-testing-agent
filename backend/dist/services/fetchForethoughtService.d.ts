import { ForethoughtResponse } from './forethoughtService';
export interface FetchUserContext {
    userId?: string;
    email?: string;
    phone?: string;
    accountStatus?: string;
    receiptId?: string;
    transactionId?: string;
    ticketId?: string;
    offerCategory?: string;
    storeName?: string;
    receiptTotal?: string;
    pointsExpected?: number;
    pointsReceived?: number;
    referralCode?: string;
    gameId?: string;
    platform?: 'iOS' | 'Android' | 'Web';
}
export declare class FetchForethoughtService {
    private static instance;
    private widgetApiKey;
    private widgetUrl;
    private constructor();
    static getInstance(): FetchForethoughtService;
    /**
     * Process message through Forethought widget with Fetch-specific context
     */
    processMessage(message: string, category: string, userContext: FetchUserContext, sessionId: string): Promise<ForethoughtResponse>;
    /**
     * Build Fetch-specific data attributes for Forethought
     */
    private buildFetchDataAttributes;
    /**
     * Map our categories to Forethought Intent Categories
     */
    private mapCategoryToIntent;
    /**
     * Generate category-specific responses for testing
     */
    private generateCategoryResponse;
    /**
     * Parse Forethought widget response
     */
    private parseResponse;
}
//# sourceMappingURL=fetchForethoughtService.d.ts.map