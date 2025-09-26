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
exports.AutonomousConversationService = void 0;
var openai_1 = require("openai");
var forethoughtService_1 = require("./forethoughtService");
var AutonomousConversationService = /** @class */ (function () {
    function AutonomousConversationService() {
        this.conversationLogs = new Map();
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.forethoughtService = new forethoughtService_1.ForethoughtService();
    }
    /**
     * Run autonomous conversation cycles
     */
    AutonomousConversationService.prototype.runConversationCycles = function (initialPrompt, config) {
        return __awaiter(this, void 0, void 0, function () {
            var report, scenarios, i, persona, scenario, conversationLog, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83D\uDE80 Starting ".concat(config.conversationCount, " autonomous conversation cycles..."));
                        report = {
                            id: "test-".concat(Date.now()),
                            startTime: new Date(),
                            endTime: new Date(),
                            totalConversations: config.conversationCount,
                            successfulConversations: 0,
                            failedConversations: 0,
                            averageResponseTime: 0,
                            averageTurns: 0,
                            conversationLogs: [],
                            metrics: {
                                intentAccuracy: 0,
                                resolutionRate: 0,
                                customerSatisfactionScore: 0,
                                averageConfidence: 0
                            }
                        };
                        return [4 /*yield*/, this.generateConversationScenarios(initialPrompt, config.conversationCount)];
                    case 1:
                        scenarios = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < config.conversationCount)) return [3 /*break*/, 8];
                        console.log("\n\uD83D\uDCAC Starting conversation ".concat(i + 1, "/").concat(config.conversationCount));
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        persona = config.customerPersonas[i % config.customerPersonas.length];
                        scenario = scenarios[i];
                        return [4 /*yield*/, this.runSingleConversation(scenario, persona, config.maxTurns, "conv-".concat(i + 1))];
                    case 4:
                        conversationLog = _a.sent();
                        this.conversationLogs.set(conversationLog.id, conversationLog);
                        report.conversationLogs.push(conversationLog);
                        if (conversationLog.resolved) {
                            report.successfulConversations++;
                        }
                        else {
                            report.failedConversations++;
                        }
                        console.log("\u2705 Conversation ".concat(i + 1, " completed - ").concat(conversationLog.resolved ? 'RESOLVED' : 'UNRESOLVED'));
                        // Brief pause between conversations
                        return [4 /*yield*/, this.sleep(1000)];
                    case 5:
                        // Brief pause between conversations
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error("\u274C Conversation ".concat(i + 1, " failed:"), error_1);
                        report.failedConversations++;
                        return [3 /*break*/, 7];
                    case 7:
                        i++;
                        return [3 /*break*/, 2];
                    case 8:
                        report.endTime = new Date();
                        report.metrics = this.calculateMetrics(report.conversationLogs);
                        console.log("\n\uD83D\uDCCA Test Complete: ".concat(report.successfulConversations, "/").concat(report.totalConversations, " successful"));
                        return [2 /*return*/, report];
                }
            });
        });
    };
    /**
     * Run a single autonomous conversation
     */
    AutonomousConversationService.prototype.runSingleConversation = function (scenario, persona, maxTurns, conversationId) {
        return __awaiter(this, void 0, void 0, function () {
            var log, currentMessage, turnCount, conversationContext, customerTurn, startTime, forethoughtResponse, responseTime, agentTurn, shouldEnd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        log = {
                            id: conversationId,
                            startTime: new Date(),
                            endTime: new Date(),
                            turns: [],
                            resolved: false,
                            persona: persona.type,
                            scenario: scenario,
                            metrics: {
                                totalTurns: 0,
                                averageResponseTime: 0,
                                intentAccuracy: 0,
                                customerSatisfaction: 0
                            }
                        };
                        currentMessage = scenario;
                        turnCount = 0;
                        conversationContext = '';
                        _a.label = 1;
                    case 1:
                        if (!(turnCount < maxTurns)) return [3 /*break*/, 5];
                        turnCount++;
                        customerTurn = {
                            speaker: 'customer',
                            message: currentMessage,
                            timestamp: new Date()
                        };
                        log.turns.push(customerTurn);
                        conversationContext += "Customer: ".concat(currentMessage, "\n");
                        console.log("\uD83D\uDC64 Customer: ".concat(currentMessage));
                        startTime = Date.now();
                        return [4 /*yield*/, this.getForethoughtResponse(currentMessage, conversationId)];
                    case 2:
                        forethoughtResponse = _a.sent();
                        responseTime = Date.now() - startTime;
                        agentTurn = {
                            speaker: 'agent',
                            message: forethoughtResponse.response,
                            timestamp: new Date(),
                            metadata: {
                                intent: forethoughtResponse.intent,
                                confidence: forethoughtResponse.confidence,
                                responseTime: responseTime
                            }
                        };
                        log.turns.push(agentTurn);
                        conversationContext += "Agent: ".concat(forethoughtResponse.response, "\n");
                        console.log("\uD83E\uDD16 Agent: ".concat(forethoughtResponse.response));
                        if (forethoughtResponse.intent) {
                            console.log("   Intent: ".concat(forethoughtResponse.intent, " (").concat(forethoughtResponse.confidence, "% confidence)"));
                        }
                        return [4 /*yield*/, this.shouldEndConversation(conversationContext, persona)];
                    case 3:
                        shouldEnd = _a.sent();
                        if (shouldEnd.shouldEnd) {
                            log.resolved = shouldEnd.resolved;
                            console.log("\uD83C\uDFC1 Conversation ending: ".concat(shouldEnd.reason));
                            return [3 /*break*/, 5];
                        }
                        return [4 /*yield*/, this.generateCustomerResponse(conversationContext, persona, forethoughtResponse.response)];
                    case 4:
                        // Generate next customer message using OpenAI
                        currentMessage = _a.sent();
                        if (!currentMessage || currentMessage.toLowerCase().includes('thank') && currentMessage.toLowerCase().includes('resolved')) {
                            log.resolved = true;
                            return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 1];
                    case 5:
                        log.endTime = new Date();
                        log.metrics.totalTurns = log.turns.length;
                        log.metrics.averageResponseTime = this.calculateAverageResponseTime(log.turns);
                        return [2 /*return*/, log];
                }
            });
        });
    };
    /**
     * Get response from Forethought widget
     */
    AutonomousConversationService.prototype.getForethoughtResponse = function (message, sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.forethoughtService.sendMessage(message, sessionId)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                response: response.message || response.response || 'I understand your concern. Let me help you with that.',
                                intent: response.intent,
                                confidence: response.confidence
                            }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Forethought API error:', error_2);
                        // Fallback response
                        return [2 /*return*/, {
                                response: 'I apologize for any inconvenience. Let me connect you with our support team to resolve this issue.',
                                confidence: 50
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate customer response using OpenAI
     */
    AutonomousConversationService.prototype.generateCustomerResponse = function (conversationContext, persona, agentResponse) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, completion, error_3;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        prompt = "\nYou are a ".concat(persona.type, " customer having a support conversation. Based on the conversation so far and the agent's latest response, generate your next realistic customer message.\n\nPersona: ").concat(persona.description, "\nResponse Style: ").concat(persona.responseStyle, "\n\nConversation so far:\n").concat(conversationContext, "\n\nAgent just said: ").concat(agentResponse, "\n\nGenerate a realistic customer response that:\n1. Stays in character for a ").concat(persona.type, " customer\n2. Responds appropriately to the agent's message\n3. Either continues the conversation if not satisfied or thanks them if resolved\n4. Is 1-2 sentences maximum\n5. Uses natural language a real customer would use\n\nCustomer response:");
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: "gpt-4",
                                messages: [{ role: "user", content: prompt }],
                                max_tokens: 100,
                                temperature: 0.7,
                            })];
                    case 2:
                        completion = _d.sent();
                        return [2 /*return*/, ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || ''];
                    case 3:
                        error_3 = _d.sent();
                        console.error('OpenAI API error:', error_3);
                        return [2 /*return*/, ''];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate conversation scenarios based on initial prompt
     */
    AutonomousConversationService.prototype.generateConversationScenarios = function (initialPrompt, count) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, completion, scenarios, fallbackScenarios, error_4;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        prompt = "\nBased on this initial customer support prompt: \"".concat(initialPrompt, "\"\n\nGenerate ").concat(count, " different realistic customer support scenarios that are similar in nature but with different specific details, contexts, or variations. Each should be a complete customer message that would start a support conversation.\n\nMake them diverse but related to the original theme. Include different:\n- Specific details (amounts, dates, items, etc.)\n- Urgency levels\n- Customer backgrounds\n- Problem variations\n\nFormat as a numbered list:\n1. [scenario]\n2. [scenario]\n...\n\nScenarios:");
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: "gpt-4",
                                messages: [{ role: "user", content: prompt }],
                                max_tokens: 800,
                                temperature: 0.8,
                            })];
                    case 2:
                        completion = _d.sent();
                        scenarios = ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.split('\n').filter(function (line) { return line.match(/^\d+\./); }).map(function (line) { return line.replace(/^\d+\.\s*/, '').trim(); }).filter(function (scenario) { return scenario.length > 10; })) || [];
                        // Fallback if generation fails
                        if (scenarios.length < count) {
                            fallbackScenarios = Array(count - scenarios.length).fill(initialPrompt);
                            scenarios.push.apply(scenarios, fallbackScenarios);
                        }
                        return [2 /*return*/, scenarios.slice(0, count)];
                    case 3:
                        error_4 = _d.sent();
                        console.error('Scenario generation error:', error_4);
                        return [2 /*return*/, Array(count).fill(initialPrompt)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Determine if conversation should end
     */
    AutonomousConversationService.prototype.shouldEndConversation = function (conversationContext, persona) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, completion, response, parsed, error_5;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        prompt = "\nAnalyze this customer support conversation to determine if it should end and whether the issue was resolved.\n\nConversation:\n".concat(conversationContext, "\n\nCustomer persona: ").concat(persona.type, " - ").concat(persona.description, "\n\nRespond with JSON:\n{\n  \"shouldEnd\": true/false,\n  \"resolved\": true/false,\n  \"reason\": \"brief explanation\"\n}\n\nThe conversation should end if:\n- Customer expresses satisfaction/thanks\n- Issue appears resolved\n- Customer says goodbye\n- Conversation is going in circles\n- Customer is escalating beyond scope\n\nConsider the customer's persona when determining satisfaction.");
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: "gpt-4",
                                messages: [{ role: "user", content: prompt }],
                                max_tokens: 150,
                                temperature: 0.1,
                            })];
                    case 2:
                        completion = _c.sent();
                        response = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                        parsed = JSON.parse(response || '{"shouldEnd": false, "resolved": false, "reason": "continuing"}');
                        return [2 /*return*/, parsed];
                    case 3:
                        error_5 = _c.sent();
                        console.error('End conversation analysis error:', error_5);
                        return [2 /*return*/, { shouldEnd: false, resolved: false, reason: 'analysis failed' }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculate comprehensive metrics
     */
    AutonomousConversationService.prototype.calculateMetrics = function (logs) {
        var totalLogs = logs.length;
        if (totalLogs === 0)
            return { intentAccuracy: 0, resolutionRate: 0, customerSatisfactionScore: 0, averageConfidence: 0 };
        var resolvedCount = logs.filter(function (log) { return log.resolved; }).length;
        var totalTurns = logs.reduce(function (sum, log) { return sum + log.turns.length; }, 0);
        var avgTurns = totalTurns / totalLogs;
        // Calculate confidence scores
        var confidenceScores = logs
            .flatMap(function (log) { return log.turns; })
            .filter(function (turn) { var _a; return (_a = turn.metadata) === null || _a === void 0 ? void 0 : _a.confidence; })
            .map(function (turn) { return turn.metadata.confidence; });
        var avgConfidence = confidenceScores.length > 0
            ? confidenceScores.reduce(function (sum, score) { return sum + score; }, 0) / confidenceScores.length
            : 0;
        return {
            intentAccuracy: avgConfidence,
            resolutionRate: (resolvedCount / totalLogs) * 100,
            customerSatisfactionScore: (resolvedCount / totalLogs) * 100, // Simplified metric
            averageConfidence: avgConfidence
        };
    };
    AutonomousConversationService.prototype.calculateAverageResponseTime = function (turns) {
        var responseTimes = turns
            .filter(function (turn) { var _a; return (_a = turn.metadata) === null || _a === void 0 ? void 0 : _a.responseTime; })
            .map(function (turn) { return turn.metadata.responseTime; });
        return responseTimes.length > 0
            ? responseTimes.reduce(function (sum, time) { return sum + time; }, 0) / responseTimes.length
            : 0;
    };
    AutonomousConversationService.prototype.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    /**
     * Get conversation log by ID
     */
    AutonomousConversationService.prototype.getConversationLog = function (id) {
        return this.conversationLogs.get(id);
    };
    /**
     * Get all conversation logs
     */
    AutonomousConversationService.prototype.getAllConversationLogs = function () {
        return Array.from(this.conversationLogs.values());
    };
    return AutonomousConversationService;
}());
exports.AutonomousConversationService = AutonomousConversationService;
