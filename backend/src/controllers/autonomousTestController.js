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
exports.AutonomousTestController = void 0;
var autonomousConversationService_1 = require("../services/autonomousConversationService");
var AutonomousTestController = /** @class */ (function () {
    function AutonomousTestController() {
        var _this = this;
        this.runningTests = new Map();
        /**
         * Start autonomous conversation testing
         */
        this.startAutonomousTest = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, initialPrompt, _b, conversationCount, _c, maxTurns, personas, testId_1, defaultPersonas, config, testPromise;
            var _this = this;
            return __generator(this, function (_d) {
                try {
                    _a = req.body, initialPrompt = _a.initialPrompt, _b = _a.conversationCount, conversationCount = _b === void 0 ? 10 : _b, _c = _a.maxTurns, maxTurns = _c === void 0 ? 15 : _c, personas = _a.personas;
                    if (!initialPrompt) {
                        return [2 /*return*/, res.status(400).json({
                                error: 'initialPrompt is required'
                            })];
                    }
                    testId_1 = "auto-test-".concat(Date.now());
                    defaultPersonas = [
                        {
                            type: 'frustrated',
                            description: 'Frustrated customer who has been dealing with this issue for a while',
                            responseStyle: 'Impatient, direct, uses phrases like "this is ridiculous" or "I need this fixed NOW"'
                        },
                        {
                            type: 'confused',
                            description: 'Customer who doesn\'t understand technical terms and needs clear explanations',
                            responseStyle: 'Asks clarifying questions, says things like "I don\'t understand" or "what does that mean?"'
                        },
                        {
                            type: 'polite',
                            description: 'Courteous customer who is patient and cooperative',
                            responseStyle: 'Uses please/thank you, stays calm, expresses appreciation for help'
                        },
                        {
                            type: 'technical',
                            description: 'Tech-savvy customer who understands technical details and wants specific information',
                            responseStyle: 'Uses technical terminology, asks for specific details, wants root cause explanations'
                        },
                        {
                            type: 'impatient',
                            description: 'Busy customer who wants quick solutions and doesn\'t want long explanations',
                            responseStyle: 'Short responses, says things like "just tell me how to fix it" or "I don\'t have time for this"'
                        }
                    ];
                    config = {
                        maxTurns: maxTurns,
                        conversationCount: conversationCount,
                        customerPersonas: personas || defaultPersonas
                    };
                    testPromise = this.conversationService.runConversationCycles(initialPrompt, config);
                    this.runningTests.set(testId_1, testPromise);
                    res.json({
                        testId: testId_1,
                        status: 'running',
                        message: "Started autonomous test with ".concat(conversationCount, " conversations"),
                        config: {
                            conversationCount: conversationCount,
                            maxTurns: maxTurns,
                            personaCount: config.customerPersonas.length
                        }
                    });
                    // Handle completion
                    testPromise
                        .then(function (report) {
                        _this.runningTests.set(testId_1, { status: 'completed', report: report });
                        console.log("\u2705 Test ".concat(testId_1, " completed successfully"));
                    })
                        .catch(function (error) {
                        _this.runningTests.set(testId_1, { status: 'failed', error: error.message });
                        console.error("\u274C Test ".concat(testId_1, " failed:"), error);
                    });
                }
                catch (error) {
                    console.error('Error starting autonomous test:', error);
                    res.status(500).json({
                        error: 'Failed to start autonomous test',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Get test status and results
         */
        this.getTestStatus = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var testId, testData;
            return __generator(this, function (_a) {
                try {
                    testId = req.params.testId;
                    testData = this.runningTests.get(testId);
                    if (!testData) {
                        return [2 /*return*/, res.status(404).json({
                                error: 'Test not found'
                            })];
                    }
                    // If still running (Promise)
                    if (testData instanceof Promise) {
                        return [2 /*return*/, res.json({
                                testId: testId,
                                status: 'running',
                                message: 'Test is still in progress'
                            })];
                    }
                    // If completed or failed
                    return [2 /*return*/, res.json({
                            testId: testId,
                            status: testData.status,
                            report: testData.report,
                            error: testData.error
                        })];
                }
                catch (error) {
                    console.error('Error getting test status:', error);
                    res.status(500).json({
                        error: 'Failed to get test status',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Get all running/completed tests
         */
        this.getAllTests = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var tests;
            return __generator(this, function (_a) {
                try {
                    tests = Array.from(this.runningTests.entries()).map(function (_a) {
                        var _b, _c;
                        var testId = _a[0], testData = _a[1];
                        return ({
                            testId: testId,
                            status: testData instanceof Promise ? 'running' : testData.status,
                            startTime: ((_b = testData.report) === null || _b === void 0 ? void 0 : _b.startTime) || 'Unknown',
                            conversationCount: ((_c = testData.report) === null || _c === void 0 ? void 0 : _c.totalConversations) || 'Unknown'
                        });
                    });
                    res.json({ tests: tests });
                }
                catch (error) {
                    console.error('Error getting all tests:', error);
                    res.status(500).json({
                        error: 'Failed to get tests',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Get conversation logs for a specific test
         */
        this.getConversationLogs = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var testId, testData;
            return __generator(this, function (_a) {
                try {
                    testId = req.params.testId;
                    testData = this.runningTests.get(testId);
                    if (!testData || testData instanceof Promise) {
                        return [2 /*return*/, res.status(404).json({
                                error: 'Test not found or still running'
                            })];
                    }
                    if (testData.status !== 'completed') {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Test did not complete successfully'
                            })];
                    }
                    res.json({
                        testId: testId,
                        conversationLogs: testData.report.conversationLogs,
                        totalConversations: testData.report.conversationLogs.length
                    });
                }
                catch (error) {
                    console.error('Error getting conversation logs:', error);
                    res.status(500).json({
                        error: 'Failed to get conversation logs',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Get detailed report for a specific test
         */
        this.getDetailedReport = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var testId, testData, report, detailedAnalysis;
            return __generator(this, function (_a) {
                try {
                    testId = req.params.testId;
                    testData = this.runningTests.get(testId);
                    if (!testData || testData instanceof Promise) {
                        return [2 /*return*/, res.status(404).json({
                                error: 'Test not found or still running'
                            })];
                    }
                    if (testData.status !== 'completed') {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Test did not complete successfully'
                            })];
                    }
                    report = testData.report;
                    detailedAnalysis = {
                        summary: {
                            totalConversations: report.totalConversations,
                            successRate: ((report.successfulConversations / report.totalConversations) * 100).toFixed(1),
                            averageTurns: (report.conversationLogs.reduce(function (sum, log) { return sum + log.turns.length; }, 0) / report.conversationLogs.length).toFixed(1),
                            totalDuration: ((report.endTime.getTime() - report.startTime.getTime()) / 1000).toFixed(1)
                        },
                        personaBreakdown: this.analyzeByPersona(report.conversationLogs),
                        commonPatterns: this.identifyCommonPatterns(report.conversationLogs),
                        recommendations: this.generateRecommendations(report)
                    };
                    res.json({
                        testId: testId,
                        report: report,
                        analysis: detailedAnalysis
                    });
                }
                catch (error) {
                    console.error('Error getting detailed report:', error);
                    res.status(500).json({
                        error: 'Failed to get detailed report',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Stop a running test
         */
        this.stopTest = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var testId;
            return __generator(this, function (_a) {
                try {
                    testId = req.params.testId;
                    if (this.runningTests.has(testId)) {
                        this.runningTests.delete(testId);
                        res.json({
                            testId: testId,
                            message: 'Test stopped successfully'
                        });
                    }
                    else {
                        res.status(404).json({
                            error: 'Test not found'
                        });
                    }
                }
                catch (error) {
                    console.error('Error stopping test:', error);
                    res.status(500).json({
                        error: 'Failed to stop test',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                return [2 /*return*/];
            });
        }); };
        this.conversationService = new autonomousConversationService_1.AutonomousConversationService();
    }
    // Helper methods
    AutonomousTestController.prototype.analyzeByPersona = function (logs) {
        var personaStats = logs.reduce(function (acc, log) {
            var persona = log.persona;
            if (!acc[persona]) {
                acc[persona] = { total: 0, resolved: 0, averageTurns: 0 };
            }
            acc[persona].total++;
            if (log.resolved)
                acc[persona].resolved++;
            acc[persona].averageTurns += log.turns.length;
            return acc;
        }, {});
        // Calculate averages
        Object.keys(personaStats).forEach(function (persona) {
            personaStats[persona].averageTurns = (personaStats[persona].averageTurns / personaStats[persona].total).toFixed(1);
            personaStats[persona].successRate = ((personaStats[persona].resolved / personaStats[persona].total) * 100).toFixed(1);
        });
        return personaStats;
    };
    AutonomousTestController.prototype.identifyCommonPatterns = function (logs) {
        // Analyze common intents, response patterns, etc.
        var intents = new Map();
        var commonPhrases = new Map();
        logs.forEach(function (log) {
            log.turns.forEach(function (turn) {
                var _a;
                if ((_a = turn.metadata) === null || _a === void 0 ? void 0 : _a.intent) {
                    intents.set(turn.metadata.intent, (intents.get(turn.metadata.intent) || 0) + 1);
                }
            });
        });
        return {
            topIntents: Array.from(intents.entries())
                .sort(function (_a, _b) {
                var a = _a[1];
                var b = _b[1];
                return b - a;
            })
                .slice(0, 5)
                .map(function (_a) {
                var intent = _a[0], count = _a[1];
                return ({ intent: intent, count: count });
            })
        };
    };
    AutonomousTestController.prototype.generateRecommendations = function (report) {
        var recommendations = [];
        if (report.metrics.resolutionRate < 80) {
            recommendations.push('Consider improving knowledge base coverage - resolution rate is below 80%');
        }
        if (report.metrics.averageConfidence < 70) {
            recommendations.push('Review intent classification - average confidence is low');
        }
        var avgTurns = report.conversationLogs.reduce(function (sum, log) { return sum + log.turns.length; }, 0) / report.conversationLogs.length;
        if (avgTurns > 10) {
            recommendations.push('Consider streamlining conversation flow - conversations are taking many turns');
        }
        return recommendations;
    };
    return AutonomousTestController;
}());
exports.AutonomousTestController = AutonomousTestController;
