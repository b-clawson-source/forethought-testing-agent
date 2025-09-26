import { ForethoughtResponse } from '../types/conversation';
export declare class ForethoughtService {
    private apiKey;
    private baseUrl;
    private widgetUrl;
    private static instance;
    constructor();
    static getInstance(): ForethoughtService;
    sendMessage(message: string, sessionId: string): Promise<ForethoughtResponse>;
    private analyzeIntent;
    testConnectivity(): Promise<{
        success: boolean;
        responses: never[];
        recommendations: string[];
    }>;
}
//# sourceMappingURL=forethoughtService.d.ts.map