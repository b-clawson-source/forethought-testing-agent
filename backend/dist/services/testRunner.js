"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousTestRunner = void 0;
const uuid_1 = require("uuid");
const forethoughtService_1 = require("./forethoughtService");
const llmService_1 = require("./llmService");
class AutonomousTestRunner {
    constructor() {
        this.forethoughtService = new forethoughtService_1.ForethoughtService();
        this.llmService = new llmService_1.LLMService();
    }
    /**
     * Run a complete test cycle with multiple conversations
     */
    async runTestCycle(config) {
        console.log(`Starting test cycle with ${config.numberOfConversations} conversations`);
        const testReport = {
            testId: (0, uuid_1.v4)(),
            startTime: new Date(),
            endTime: new Date(),
            configuration: config,
            totalConversations: config.numberOfConversations,
            successfulConversations: 0,
            failedConversations: 0,
            successRate: 0,
            averageConversationLength: 0,
            averageResponseTime: 0,
            commonIntents: [],
            errorSummary: [],
            conversations: []
        };
        this.currentTestReport = testReport;
        // Run conversations sequentially
        for (let i = 0; i < config.numberOfConversations; i++) {
            console.log(`\nStarting conversation ${i + 1}/${config.numberOfConversations}`);
            // Generate initial prompt based on previous context
            const initialPrompt = await this.generateInitialPrompt(config.personaType, i > 0 ? testReport.conversations[i - 1] : undefined);
            // Run single conversation
            const result = await this.runSingleConversation(initialPrompt, config.personaType, config.maxTurnsPerConversation, config.delayBetweenTurns);
            testReport.conversations.push(result);
            if (result.success) {
                testReport.successfulConversations++;
            }
            else {
                testReport.failedConversations++;
            }
            // Wait between conversations
            if (i < config.numberOfConversations - 1) {
                await this.delay(config.delayBetweenConversations);
            }
        }
        // Calculate final metrics
        testReport.endTime = new Date();
        testReport.successRate = testReport.successfulConversations / testReport.totalConversations;
        testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
        testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
        testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
        testReport.errorSummary = this.summarizeErrors(testReport.conversations);
        // Generate and save report
        await this.saveTestReport(testReport);
        console.log(`\nTest cycle completed. Success rate: ${(testReport.successRate * 100).toFixed(2)}%`);
        return testReport;
    }
    /**
     * Run a single conversation to completion
     */
    async runSingleConversation(initialPrompt, personaType, maxTurns, delayBetweenTurns) {
        const sessionId = (0, uuid_1.v4)();
        const result = {
            conversationId: sessionId,
            startTime: new Date(),
            endTime: new Date(),
            totalTurns: 0,
            success: true,
            errors: [],
            metrics: {
                averageResponseTime: 0,
                intentRecognitionAccuracy: 0,
                resolutionAchieved: false
            },
            conversationLog: []
        };
        let currentMessage = initialPrompt;
        let conversationComplete = false;
        let turnCount = 0;
        let totalResponseTime = 0;
        while (!conversationComplete && turnCount < maxTurns) {
            const turnStartTime = Date.now();
            try {
                // Query Forethought
                const forethoughtResponse = await this.forethoughtService.queryKnowledgeBase({
                    message: currentMessage,
                    sessionId: sessionId
                });
                // Generate LLM response based on Forethought's answer
                const llmResponse = await this.llmService.generateResponse(currentMessage, forethoughtResponse.response, personaType, result.conversationLog);
                const responseTime = Date.now() - turnStartTime;
                totalResponseTime += responseTime;
                // Log the turn
                const turn = {
                    turnNumber: turnCount + 1,
                    timestamp: new Date(),
                    userMessage: currentMessage,
                    forethoughtResponse: forethoughtResponse.response,
                    llmResponse: llmResponse.message,
                    intent: forethoughtResponse.intent,
                    confidence: forethoughtResponse.confidence,
                    responseTime: responseTime
                };
                result.conversationLog.push(turn);
                turnCount++;
                // Check if conversation should end
                conversationComplete = llmResponse.shouldEndConversation ||
                    turnCount >= maxTurns ||
                    this.isResolutionAchieved(llmResponse.message);
                if (!conversationComplete) {
                    // Generate next user message
                    currentMessage = await this.llmService.generateNextUserMessage(personaType, result.conversationLog);
                    await this.delay(delayBetweenTurns);
                }
            }
            catch (error) {
                console.error(`Error in turn ${turnCount + 1}:`, error);
                result.errors.push(`Turn ${turnCount + 1}: ${error.message}`);
                result.success = false;
                conversationComplete = true;
            }
        }
        // Finalize metrics
        result.endTime = new Date();
        result.totalTurns = turnCount;
        result.metrics.averageResponseTime = totalResponseTime / turnCount;
        result.metrics.resolutionAchieved = this.isResolutionAchieved(result.conversationLog[result.conversationLog.length - 1]?.llmResponse);
        return result;
    }
    /**
     * Generate initial prompt based on persona and context
     */
    async generateInitialPrompt(personaType, previousConversation) {
        const context = previousConversation ?
            `Previous conversation ended with: ${previousConversation.conversationLog[previousConversation.conversationLog.length - 1]?.llmResponse}` : '';
        return this.llmService.generateInitialPrompt(personaType, context);
    }
    /**
     * Check if conversation reached a resolution
     */
    isResolutionAchieved(lastMessage) {
        if (!lastMessage)
            return false;
        const resolutionPhrases = [
            'resolved',
            'thank you',
            'that helps',
            'problem solved',
            'issue fixed',
            'goodbye',
            'have a nice day'
        ];
        const lowerMessage = lastMessage.toLowerCase();
        return resolutionPhrases.some(phrase => lowerMessage.includes(phrase));
    }
    /**
     * Calculate average conversation length
     */
    calculateAverageLength(conversations) {
        if (conversations.length === 0)
            return 0;
        const total = conversations.reduce((sum, conv) => sum + conv.totalTurns, 0);
        return total / conversations.length;
    }
    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(conversations) {
        if (conversations.length === 0)
            return 0;
        const total = conversations.reduce((sum, conv) => sum + conv.metrics.averageResponseTime, 0);
        return total / conversations.length;
    }
    /**
     * Extract common intents from conversations
     */
    extractCommonIntents(conversations) {
        const intentMap = new Map();
        conversations.forEach(conv => {
            conv.conversationLog.forEach(turn => {
                if (turn.intent) {
                    intentMap.set(turn.intent, (intentMap.get(turn.intent) || 0) + 1);
                }
            });
        });
        return Array.from(intentMap.entries())
            .map(([intent, count]) => ({ intent, count }))
            .sort((a, b) => b.count - a.count);
    }
    /**
     * Summarize errors from conversations
     */
    summarizeErrors(conversations) {
        const errorMap = new Map();
        conversations.forEach(conv => {
            conv.errors.forEach(error => {
                errorMap.set(error, (errorMap.get(error) || 0) + 1);
            });
        });
        return Array.from(errorMap.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count);
    }
    /**
     * Save test report to file
     */
    async saveTestReport(report) {
        const fs = require('fs').promises;
        const path = require('path');
        const reportsDir = path.join(process.cwd(), 'test-reports');
        await fs.mkdir(reportsDir, { recursive: true });
        const filename = `test-report-${report.testId}-${Date.now()}.json`;
        const filepath = path.join(reportsDir, filename);
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        console.log(`Test report saved to: ${filepath}`);
    }
    /**
     * Utility function to add delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AutonomousTestRunner = AutonomousTestRunner;
