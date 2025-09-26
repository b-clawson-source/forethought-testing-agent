"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousTestRunner = void 0;
var uuid_1 = require("uuid");
var forethoughtService_1 = require("./forethoughtService");
var llmService_1 = require("./llmService");
var AutonomousTestRunner = /** @class */ (function () {
    function AutonomousTestRunner() {
        this.forethoughtService = forethoughtService_1.ForethoughtService.getInstance();
        this.llmService = llmService_1.LLMService.getInstance();
    }
    /**
     * Run a complete test cycle with multiple conversations
     */
    AutonomousTestRunner.prototype.runTestCycle = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var testReport, i, initialPrompt, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Starting test cycle with ".concat(config.numberOfConversations, " conversations"));
                        testReport = {
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
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < config.numberOfConversations)) return [3 /*break*/, 6];
                        console.log("\nStarting conversation ".concat(i + 1, "/").concat(config.numberOfConversations));
                        return [4 /*yield*/, this.generateInitialPrompt(config.personaType, i > 0 ? testReport.conversations[i - 1] : undefined)];
                    case 2:
                        initialPrompt = _a.sent();
                        return [4 /*yield*/, this.runSingleConversation(initialPrompt, config.personaType, config.maxTurnsPerConversation, config.delayBetweenTurns)];
                    case 3:
                        result = _a.sent();
                        testReport.conversations.push(result);
                        if (result.success) {
                            testReport.successfulConversations++;
                        }
                        else {
                            testReport.failedConversations++;
                        }
                        if (!(i < config.numberOfConversations - 1)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.delay(config.delayBetweenConversations)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6:
                        // Calculate final metrics
                        testReport.endTime = new Date();
                        testReport.successRate = testReport.successfulConversations / testReport.totalConversations;
                        testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
                        testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
                        testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
                        testReport.errorSummary = this.summarizeErrors(testReport.conversations);
                        // Generate and save report
                        return [4 /*yield*/, this.saveTestReport(testReport)];
                    case 7:
                        // Generate and save report
                        _a.sent();
                        console.log("\nTest cycle completed. Success rate: ".concat((testReport.successRate * 100).toFixed(2), "%"));
                        return [2 /*return*/, testReport];
                }
            });
        });
    };
    /**
     * Run a single conversation to completion
     */
    AutonomousTestRunner.prototype.runSingleConversation = function (initialPrompt, personaType, maxTurns, delayBetweenTurns) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionId, result, currentMessage, conversationComplete, turnCount, totalResponseTime, turnStartTime, forethoughtResponse, llmResponse, responseTime, turn, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sessionId = (0, uuid_1.v4)();
                        result = {
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
                        currentMessage = initialPrompt;
                        conversationComplete = false;
                        turnCount = 0;
                        totalResponseTime = 0;
                        _b.label = 1;
                    case 1:
                        if (!(!conversationComplete && turnCount < maxTurns)) return [3 /*break*/, 10];
                        turnStartTime = Date.now();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 8, , 9]);
                        return [4 /*yield*/, this.forethoughtService.processMessage(currentMessage, sessionId)];
                    case 3:
                        forethoughtResponse = _b.sent();
                        return [4 /*yield*/, this.llmService.generateTestResponse(currentMessage, forethoughtResponse.response, personaType, result.conversationLog)];
                    case 4:
                        llmResponse = _b.sent();
                        responseTime = Date.now() - turnStartTime;
                        totalResponseTime += responseTime;
                        turn = {
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
                        console.log("Turn ".concat(turnCount, ": Intent=").concat(forethoughtResponse.intent, ", Confidence=").concat(forethoughtResponse.confidence.toFixed(2)));
                        // Check if conversation should end
                        conversationComplete = llmResponse.shouldEndConversation ||
                            turnCount >= maxTurns ||
                            this.isResolutionAchieved(llmResponse.message);
                        if (!!conversationComplete) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.llmService.generateNextUserMessage(personaType, result.conversationLog)];
                    case 5:
                        // Generate next user message
                        currentMessage = _b.sent();
                        return [4 /*yield*/, this.delay(delayBetweenTurns)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _b.sent();
                        console.error("Error in turn ".concat(turnCount + 1, ":"), error_1);
                        result.errors.push("Turn ".concat(turnCount + 1, ": ").concat(error_1.message));
                        result.success = false;
                        conversationComplete = true;
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 1];
                    case 10:
                        // Finalize metrics
                        result.endTime = new Date();
                        result.totalTurns = turnCount;
                        result.metrics.averageResponseTime = turnCount > 0 ? totalResponseTime / turnCount : 0;
                        result.metrics.resolutionAchieved = this.isResolutionAchieved((_a = result.conversationLog[result.conversationLog.length - 1]) === null || _a === void 0 ? void 0 : _a.llmResponse);
                        result.metrics.intentRecognitionAccuracy = this.calculateIntentAccuracy(result.conversationLog);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Generate initial prompt based on persona and context
     */
    AutonomousTestRunner.prototype.generateInitialPrompt = function (personaType, previousConversation) {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            var _a;
            return __generator(this, function (_b) {
                context = previousConversation ?
                    "Previous conversation ended with: ".concat(((_a = previousConversation.conversationLog[previousConversation.conversationLog.length - 1]) === null || _a === void 0 ? void 0 : _a.llmResponse) || 'no previous context') : '';
                return [2 /*return*/, this.llmService.generateInitialPrompt(personaType, context)];
            });
        });
    };
    /**
     * Check if conversation reached a resolution
     */
    AutonomousTestRunner.prototype.isResolutionAchieved = function (lastMessage) {
        if (!lastMessage)
            return false;
        var resolutionPhrases = [
            'resolved',
            'thank you',
            'thanks',
            'that helps',
            'problem solved',
            'issue fixed',
            'goodbye',
            'bye',
            'have a nice day',
            'appreciate',
            'perfect',
            'all set'
        ];
        var lowerMessage = lastMessage.toLowerCase();
        return resolutionPhrases.some(function (phrase) { return lowerMessage.includes(phrase); });
    };
    /**
     * Calculate intent recognition accuracy
     */
    AutonomousTestRunner.prototype.calculateIntentAccuracy = function (conversationLog) {
        var turnsWithIntents = conversationLog.filter(function (turn) { return turn.intent && turn.confidence; });
        if (turnsWithIntents.length === 0)
            return 0;
        var totalConfidence = turnsWithIntents.reduce(function (sum, turn) { return sum + (turn.confidence || 0); }, 0);
        return totalConfidence / turnsWithIntents.length;
    };
    /**
     * Calculate average conversation length
     */
    AutonomousTestRunner.prototype.calculateAverageLength = function (conversations) {
        if (conversations.length === 0)
            return 0;
        var total = conversations.reduce(function (sum, conv) { return sum + conv.totalTurns; }, 0);
        return total / conversations.length;
    };
    /**
     * Calculate average response time
     */
    AutonomousTestRunner.prototype.calculateAverageResponseTime = function (conversations) {
        if (conversations.length === 0)
            return 0;
        var total = conversations.reduce(function (sum, conv) { return sum + conv.metrics.averageResponseTime; }, 0);
        return total / conversations.length;
    };
    /**
     * Extract common intents from conversations
     */
    AutonomousTestRunner.prototype.extractCommonIntents = function (conversations) {
        var intentMap = new Map();
        conversations.forEach(function (conv) {
            conv.conversationLog.forEach(function (turn) {
                if (turn.intent) {
                    intentMap.set(turn.intent, (intentMap.get(turn.intent) || 0) + 1);
                }
            });
        });
        return Array.from(intentMap.entries())
            .map(function (_a) {
            var intent = _a[0], count = _a[1];
            return ({ intent: intent, count: count });
        })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, 10); // Top 10 intents
    };
    /**
     * Summarize errors from conversations
     */
    AutonomousTestRunner.prototype.summarizeErrors = function (conversations) {
        var errorMap = new Map();
        conversations.forEach(function (conv) {
            conv.errors.forEach(function (error) {
                // Simplify error message for grouping
                var simplifiedError = error.replace(/Turn \d+: /, '').substring(0, 100);
                errorMap.set(simplifiedError, (errorMap.get(simplifiedError) || 0) + 1);
            });
        });
        return Array.from(errorMap.entries())
            .map(function (_a) {
            var error = _a[0], count = _a[1];
            return ({ error: error, count: count });
        })
            .sort(function (a, b) { return b.count - a.count; });
    };
    /**
     * Save test report to file
     */
    AutonomousTestRunner.prototype.saveTestReport = function (report) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, reportsDir, filename, filepath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fs = require('fs').promises;
                        path = require('path');
                        reportsDir = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.mkdir(reportsDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        filename = "test-report-".concat(report.testId, "-").concat(Date.now(), ".json");
                        filepath = path.join(reportsDir, filename);
                        return [4 /*yield*/, fs.writeFile(filepath, JSON.stringify(report, null, 2))];
                    case 2:
                        _a.sent();
                        console.log("Test report saved to: ".concat(filepath));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Utility function to add delays
     */
    AutonomousTestRunner.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return AutonomousTestRunner;
}());
exports.AutonomousTestRunner = AutonomousTestRunner;
