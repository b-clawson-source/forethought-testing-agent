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
exports.FetchTestRunner = void 0;
var uuid_1 = require("uuid");
var fetchForethoughtService_1 = require("./fetchForethoughtService");
var llmService_1 = require("./llmService");
var fetchPersonas_1 = require("../config/fetchPersonas");
var FetchTestRunner = /** @class */ (function () {
    function FetchTestRunner() {
        this.fetchForethoughtService = fetchForethoughtService_1.FetchForethoughtService.getInstance();
        this.llmService = llmService_1.LLMService.getInstance();
    }
    /**
     * Run comprehensive Fetch category testing
     */
    FetchTestRunner.prototype.runFetchTestSuite = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var testReport, _i, _a, category, categoryPersonas, i, persona, result, fetchMetrics;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("\n\uD83D\uDE80 Starting Fetch Test Suite");
                        console.log("Categories: ".concat(config.testCategories.join(', ')));
                        console.log("Conversations per category: ".concat(config.numberOfConversations));
                        testReport = {
                            testId: (0, uuid_1.v4)(),
                            startTime: new Date(),
                            endTime: new Date(),
                            configuration: config,
                            totalConversations: 0,
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
                        _i = 0, _a = config.testCategories;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        category = _a[_i];
                        console.log("\n\uD83D\uDCC1 Testing Category: ".concat(category));
                        categoryPersonas = (0, fetchPersonas_1.getPersonasByCategory)(category);
                        if (categoryPersonas.length === 0) {
                            console.warn("No personas found for category: ".concat(category));
                            return [3 /*break*/, 6];
                        }
                        i = 0;
                        _b.label = 2;
                    case 2:
                        if (!(i < config.numberOfConversations)) return [3 /*break*/, 6];
                        persona = categoryPersonas[i % categoryPersonas.length];
                        console.log("\n\uD83E\uDDD1 Testing with persona: ".concat(persona.name));
                        return [4 /*yield*/, this.runFetchConversation(persona, config.maxTurnsPerConversation, config.delayBetweenTurns)];
                    case 3:
                        result = _b.sent();
                        testReport.conversations.push(result);
                        testReport.totalConversations++;
                        if (result.success) {
                            testReport.successfulConversations++;
                            console.log("\u2705 Conversation successful");
                        }
                        else {
                            testReport.failedConversations++;
                            console.log("\u274C Conversation failed: ".concat(result.errors[0]));
                        }
                        if (!(i < config.numberOfConversations - 1)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.delay(config.delayBetweenConversations)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 2];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7:
                        // Calculate final metrics
                        testReport.endTime = new Date();
                        testReport.successRate = testReport.successfulConversations / testReport.totalConversations;
                        testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
                        testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
                        testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
                        testReport.errorSummary = this.summarizeErrors(testReport.conversations);
                        fetchMetrics = this.calculateFetchMetrics(testReport);
                        testReport.fetchMetrics = fetchMetrics;
                        // Save report
                        return [4 /*yield*/, this.saveTestReport(testReport)];
                    case 8:
                        // Save report
                        _b.sent();
                        console.log("\n\uD83D\uDCCA Test Suite Completed");
                        console.log("Success Rate: ".concat((testReport.successRate * 100).toFixed(2), "%"));
                        console.log("Average Response Time: ".concat(testReport.averageResponseTime.toFixed(0), "ms"));
                        return [2 /*return*/, testReport];
                }
            });
        });
    };
    /**
     * Run a single Fetch conversation
     */
    FetchTestRunner.prototype.runFetchConversation = function (persona, maxTurns, delayBetweenTurns) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionId, result, initialPrompt, currentMessage, conversationComplete, turnCount, totalResponseTime, turnStartTime, userContext, forethoughtResponse, llmResponse, responseTime, turn, error_1;
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
                        initialPrompt = persona.initialPrompts[Math.floor(Math.random() * persona.initialPrompts.length)];
                        currentMessage = initialPrompt;
                        conversationComplete = false;
                        turnCount = 0;
                        totalResponseTime = 0;
                        console.log("\uD83D\uDCAC Initial: \"".concat(initialPrompt.substring(0, 60), "...\""));
                        _b.label = 1;
                    case 1:
                        if (!(!conversationComplete && turnCount < maxTurns)) return [3 /*break*/, 10];
                        turnStartTime = Date.now();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 8, , 9]);
                        userContext = {
                            userId: "test_user_".concat(persona.id),
                            platform: 'iOS',
                            accountStatus: 'active'
                        };
                        return [4 /*yield*/, this.fetchForethoughtService.processMessage(currentMessage, persona.category, userContext, sessionId)];
                    case 3:
                        forethoughtResponse = _b.sent();
                        return [4 /*yield*/, this.generateFetchCustomerResponse(currentMessage, forethoughtResponse.response, persona, result.conversationLog)];
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
                        console.log("   Turn ".concat(turnCount, ": ").concat(forethoughtResponse.intent, " (").concat(forethoughtResponse.confidence.toFixed(2), ")"));
                        // Check if conversation should end
                        conversationComplete = llmResponse.shouldEndConversation ||
                            turnCount >= maxTurns ||
                            this.isResolutionAchieved(llmResponse.message);
                        if (!!conversationComplete) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.generateNextFetchMessage(persona, result.conversationLog)];
                    case 5:
                        // Generate next message based on persona behavior
                        currentMessage = _b.sent();
                        return [4 /*yield*/, this.delay(delayBetweenTurns)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _b.sent();
                        console.error("Error in turn ".concat(turnCount + 1, ":"), error_1.message);
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
     * Generate customer response based on Fetch persona
     */
    FetchTestRunner.prototype.generateFetchCustomerResponse = function (userMessage, forethoughtResponse, persona, history) {
        return __awaiter(this, void 0, void 0, function () {
            var systemPrompt, messages, response, shouldEnd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        systemPrompt = "You are a Fetch Rewards user with these characteristics:\n- ".concat(persona.description, "\n- Frustration level: ").concat(persona.context.frustrationLevel, "\n- Account age: ").concat(persona.context.accountAge || 'unknown', "\n- Category: ").concat(persona.category, "\n\nBehavioral traits: ").concat(persona.characteristics.join(', '), "\nExpected behaviors: ").concat(persona.expectedBehaviors.join('; '), "\n\nRespond naturally to the support agent's message. If your issue is resolved, express satisfaction.\nIf not resolved, continue based on your persona's characteristics.");
                        messages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'assistant', content: forethoughtResponse },
                            { role: 'user', content: 'How do you respond as this Fetch user?' }
                        ];
                        return [4 /*yield*/, this.llmService.generateResponse({
                                messages: messages,
                                config: {
                                    provider: 'openai',
                                    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                                    temperature: 0.8,
                                    maxTokens: 200
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        shouldEnd = this.checkForConversationEnd(response.message.content);
                        return [2 /*return*/, {
                                message: response.message.content,
                                shouldEndConversation: shouldEnd
                            }];
                }
            });
        });
    };
    /**
     * Generate next message based on Fetch persona
     */
    FetchTestRunner.prototype.generateNextFetchMessage = function (persona, history) {
        return __awaiter(this, void 0, void 0, function () {
            var lastTurn, systemPrompt, messages, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        lastTurn = history[history.length - 1];
                        systemPrompt = "As a ".concat(persona.name, ", continue the conversation based on the support response.\nYour frustration level: ").concat(persona.context.frustrationLevel, "\nYour characteristics: ").concat(persona.characteristics.join(', '), "\nStay in character and respond naturally.");
                        messages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'assistant', content: lastTurn.forethoughtResponse || '' },
                            { role: 'user', content: 'What is your follow-up question or response?' }
                        ];
                        return [4 /*yield*/, this.llmService.generateResponse({
                                messages: messages,
                                config: {
                                    provider: 'openai',
                                    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                                    temperature: 0.8,
                                    maxTokens: 150
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.message.content];
                }
            });
        });
    };
    /**
     * Calculate Fetch-specific metrics
     */
    FetchTestRunner.prototype.calculateFetchMetrics = function (report) {
        var _this = this;
        var categoryMetrics = {};
        // Group conversations by category
        report.conversations.forEach(function (conv) {
            // Extract category from conversation (you'd need to track this)
            var category = _this.extractCategoryFromConversation(conv);
            if (!categoryMetrics[category]) {
                categoryMetrics[category] = {
                    total: 0,
                    successful: 0,
                    avgTurns: 0,
                    avgResponseTime: 0,
                    resolutionRate: 0,
                    intents: new Map()
                };
            }
            categoryMetrics[category].total++;
            if (conv.success)
                categoryMetrics[category].successful++;
            categoryMetrics[category].avgTurns += conv.totalTurns;
            categoryMetrics[category].avgResponseTime += conv.metrics.averageResponseTime;
            if (conv.metrics.resolutionAchieved)
                categoryMetrics[category].resolutionRate++;
            // Track intents
            conv.conversationLog.forEach(function (turn) {
                if (turn.intent) {
                    var count = categoryMetrics[category].intents.get(turn.intent) || 0;
                    categoryMetrics[category].intents.set(turn.intent, count + 1);
                }
            });
        });
        // Calculate averages
        Object.keys(categoryMetrics).forEach(function (category) {
            var metrics = categoryMetrics[category];
            if (metrics.total > 0) {
                metrics.avgTurns = metrics.avgTurns / metrics.total;
                metrics.avgResponseTime = metrics.avgResponseTime / metrics.total;
                metrics.resolutionRate = metrics.resolutionRate / metrics.total;
                metrics.successRate = metrics.successful / metrics.total;
                metrics.topIntents = Array.from(metrics.intents.entries())
                    .sort(function (a, b) { return b[1] - a[1]; })
                    .slice(0, 3)
                    .map(function (_a) {
                    var intent = _a[0], count = _a[1];
                    return ({ intent: intent, count: count });
                });
            }
        });
        return {
            byCategory: categoryMetrics,
            overallResolutionRate: this.calculateOverallResolutionRate(report),
            averageTurnsToResolution: this.calculateAvgTurnsToResolution(report),
            intentAccuracyByCategory: this.calculateIntentAccuracyByCategory(report)
        };
    };
    /**
     * Helper methods for metrics
     */
    FetchTestRunner.prototype.extractCategoryFromConversation = function (conv) {
        var _a;
        // Extract from first intent or default
        var firstIntent = ((_a = conv.conversationLog.find(function (turn) { return turn.intent; })) === null || _a === void 0 ? void 0 : _a.intent) || '';
        if (firstIntent.includes('missing_points'))
            return 'missing_points';
        if (firstIntent.includes('account'))
            return 'account_management';
        if (firstIntent.includes('fetch_play'))
            return 'fetch_play';
        if (firstIntent.includes('reward'))
            return 'rewards_gift_cards';
        if (firstIntent.includes('receipt'))
            return 'receipt_issues';
        if (firstIntent.includes('ereceipt'))
            return 'ereceipt_scanning';
        if (firstIntent.includes('referral'))
            return 'referral_issues';
        return 'unknown';
    };
    FetchTestRunner.prototype.calculateOverallResolutionRate = function (report) {
        var resolved = report.conversations.filter(function (c) { return c.metrics.resolutionAchieved; }).length;
        return report.conversations.length > 0 ? resolved / report.conversations.length : 0;
    };
    FetchTestRunner.prototype.calculateAvgTurnsToResolution = function (report) {
        var resolvedConvs = report.conversations.filter(function (c) { return c.metrics.resolutionAchieved; });
        if (resolvedConvs.length === 0)
            return 0;
        var totalTurns = resolvedConvs.reduce(function (sum, c) { return sum + c.totalTurns; }, 0);
        return totalTurns / resolvedConvs.length;
    };
    FetchTestRunner.prototype.calculateIntentAccuracyByCategory = function (report) {
        var _this = this;
        var accuracyByCategory = {};
        report.conversations.forEach(function (conv) {
            var category = _this.extractCategoryFromConversation(conv);
            if (!accuracyByCategory[category])
                accuracyByCategory[category] = [];
            accuracyByCategory[category].push(conv.metrics.intentRecognitionAccuracy);
        });
        var result = {};
        Object.keys(accuracyByCategory).forEach(function (category) {
            var accuracies = accuracyByCategory[category];
            result[category] = accuracies.reduce(function (a, b) { return a + b; }, 0) / accuracies.length;
        });
        return result;
    };
    /**
     * Check if conversation reached resolution
     */
    FetchTestRunner.prototype.isResolutionAchieved = function (lastMessage) {
        if (!lastMessage)
            return false;
        var resolutionPhrases = [
            'thank you',
            'thanks',
            'that helps',
            'perfect',
            'great',
            'resolved',
            'all set',
            'appreciate',
            'problem solved',
            'makes sense',
            'got it'
        ];
        var lowerMessage = lastMessage.toLowerCase();
        return resolutionPhrases.some(function (phrase) { return lowerMessage.includes(phrase); });
    };
    /**
     * Check for conversation end
     */
    FetchTestRunner.prototype.checkForConversationEnd = function (message) {
        var endPhrases = [
            'thank you',
            'thanks',
            'goodbye',
            'bye',
            'have a nice day',
            'that\'s all',
            'all set',
            'perfect'
        ];
        var lowerMessage = message.toLowerCase();
        return endPhrases.some(function (phrase) { return lowerMessage.includes(phrase); });
    };
    /**
     * Calculate intent accuracy
     */
    FetchTestRunner.prototype.calculateIntentAccuracy = function (conversationLog) {
        var turnsWithIntents = conversationLog.filter(function (turn) { return turn.intent && turn.confidence; });
        if (turnsWithIntents.length === 0)
            return 0;
        var totalConfidence = turnsWithIntents.reduce(function (sum, turn) { return sum + (turn.confidence || 0); }, 0);
        return totalConfidence / turnsWithIntents.length;
    };
    /**
     * Calculate average length
     */
    FetchTestRunner.prototype.calculateAverageLength = function (conversations) {
        if (conversations.length === 0)
            return 0;
        var total = conversations.reduce(function (sum, conv) { return sum + conv.totalTurns; }, 0);
        return total / conversations.length;
    };
    /**
     * Calculate average response time
     */
    FetchTestRunner.prototype.calculateAverageResponseTime = function (conversations) {
        if (conversations.length === 0)
            return 0;
        var total = conversations.reduce(function (sum, conv) { return sum + conv.metrics.averageResponseTime; }, 0);
        return total / conversations.length;
    };
    /**
     * Extract common intents
     */
    FetchTestRunner.prototype.extractCommonIntents = function (conversations) {
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
            .slice(0, 15);
    };
    /**
     * Summarize errors
     */
    FetchTestRunner.prototype.summarizeErrors = function (conversations) {
        var errorMap = new Map();
        conversations.forEach(function (conv) {
            conv.errors.forEach(function (error) {
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
     * Save test report
     */
    FetchTestRunner.prototype.saveTestReport = function (report) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, reportsDir, timestamp, filename, filepath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fs = require('fs').promises;
                        path = require('path');
                        reportsDir = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.mkdir(reportsDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        filename = "fetch-test-".concat(report.testId, "-").concat(timestamp, ".json");
                        filepath = path.join(reportsDir, filename);
                        return [4 /*yield*/, fs.writeFile(filepath, JSON.stringify(report, null, 2))];
                    case 2:
                        _a.sent();
                        console.log("\uD83D\uDCC1 Report saved: ".concat(filepath));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Utility delay function
     */
    FetchTestRunner.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return FetchTestRunner;
}());
exports.FetchTestRunner = FetchTestRunner;
