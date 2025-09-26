"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
var openai_1 = require("openai");
var LLMService = /** @class */ (function () {
    function LLMService() {
        this.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            averageResponseTime: 0,
            errorRate: 0,
            costEstimate: 0,
            requestsPerMinute: 0
        };
        this.requestTimes = [];
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    LLMService.getInstance = function () {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    };
    /**
     * Core method for generating OpenAI responses
     */
    LLMService.prototype.generateResponse = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, openAIMessages, completion, processingTime, response, error_1, processingTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        openAIMessages = this.convertToOpenAIFormat(request.messages);
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: request.config.model,
                                messages: openAIMessages,
                                temperature: request.config.temperature,
                                max_tokens: request.config.maxTokens,
                                top_p: request.config.topP,
                                frequency_penalty: request.config.frequencyPenalty,
                                presence_penalty: request.config.presencePenalty
                            })];
                    case 2:
                        completion = _a.sent();
                        processingTime = Date.now() - startTime;
                        response = this.formatResponse(completion, processingTime);
                        // Update metrics
                        this.updateMetrics(response);
                        console.log("LLM request completed: ".concat(response.usage.totalTokens, " tokens in ").concat(processingTime, "ms"));
                        return [2 /*return*/, response];
                    case 3:
                        error_1 = _a.sent();
                        processingTime = Date.now() - startTime;
                        console.error('LLM request failed:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate conversation response (existing method)
     */
    LLMService.prototype.generateConversationResponse = function (messages, context, config) {
        return __awaiter(this, void 0, void 0, function () {
            var fullConfig, systemMessage, fullMessages, request;
            return __generator(this, function (_a) {
                fullConfig = __assign({ provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview', temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'), maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000') }, config);
                systemMessage = this.buildSystemMessage(context);
                fullMessages = __spreadArray([systemMessage], messages, true);
                request = {
                    messages: fullMessages,
                    config: fullConfig,
                    context: context
                };
                return [2 /*return*/, this.generateResponse(request)];
            });
        });
    };
    /**
     * TEST METHOD: Generate response for autonomous testing
     */
    LLMService.prototype.generateTestResponse = function (userMessage, forethoughtResponse, personaType, conversationHistory) {
        return __awaiter(this, void 0, void 0, function () {
            var systemPrompt, messages, response, shouldEnd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        systemPrompt = this.buildTestSystemPrompt(personaType, conversationHistory);
                        messages = __spreadArray(__spreadArray([
                            { role: 'system', content: systemPrompt }
                        ], this.convertHistoryToMessages(conversationHistory.slice(-3)), true), [
                            { role: 'assistant', content: forethoughtResponse },
                            {
                                role: 'user',
                                content: "As the ".concat(personaType, " customer, respond naturally to the support agent's message above. \n        If your issue has been resolved or you're satisfied, express that naturally (e.g., \"thank you\", \"that helps\", \"perfect\").\n        Otherwise, continue the conversation with follow-up questions or clarifications.\n        Stay in character and be realistic.")
                            }
                        ], false);
                        return [4 /*yield*/, this.generateResponse({
                                messages: messages,
                                config: {
                                    provider: 'openai',
                                    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                                    temperature: 0.8,
                                    maxTokens: 300
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
     * TEST METHOD: Generate next user message
     */
    LLMService.prototype.generateNextUserMessage = function (personaType, conversationHistory) {
        return __awaiter(this, void 0, void 0, function () {
            var lastTurn, systemPrompt, messages, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        lastTurn = conversationHistory[conversationHistory.length - 1];
                        systemPrompt = "You are a ".concat(personaType, " customer continuing a support conversation.\n    Based on the agent's last response, generate your next message.\n    Stay in character and be realistic.");
                        messages = __spreadArray(__spreadArray([
                            { role: 'system', content: systemPrompt }
                        ], this.convertHistoryToMessages(conversationHistory.slice(-2)), true), [
                            {
                                role: 'user',
                                content: "The support agent said: \"".concat(lastTurn.forethoughtResponse, "\". What is your natural response?")
                            }
                        ], false);
                        return [4 /*yield*/, this.generateResponse({
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
                        return [2 /*return*/, response.message.content];
                }
            });
        });
    };
    /**
     * TEST METHOD: Generate initial prompt
     */
    LLMService.prototype.generateInitialPrompt = function (personaType, previousContext) {
        return __awaiter(this, void 0, void 0, function () {
            var personas, personaPrompt, systemPrompt, messages, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        personas = {
                            'frustrated_customer': 'You are a frustrated customer experiencing repeated technical issues with the service.',
                            'confused_elderly': 'You are an elderly person who is not tech-savvy and needs patient explanations.',
                            'angry_billing': 'You are upset about unexpected charges on your account.',
                            'new_user': 'You are a new user trying to understand how the service works.',
                            'technical_expert': 'You are technically proficient and need advanced troubleshooting help.',
                            'happy_customer': 'You are generally satisfied but have a specific question.'
                        };
                        personaPrompt = personas[personaType] || personas['new_user'];
                        systemPrompt = "".concat(personaPrompt, "\n    Generate a realistic initial customer support message.\n    ").concat(previousContext ? "Build upon this context: ".concat(previousContext) : 'Start a new topic.', "\n    The message should be 1-3 sentences expressing a specific problem or question.");
                        messages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: 'Generate my initial support request:' }
                        ];
                        return [4 /*yield*/, this.generateResponse({
                                messages: messages,
                                config: {
                                    provider: 'openai',
                                    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                                    temperature: 0.9,
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
     * Build system prompt for testing
     */
    LLMService.prototype.buildTestSystemPrompt = function (personaType, history) {
        var turnCount = history.length;
        var personaBehaviors = {
            'frustrated_customer': 'Show impatience, demand quick solutions, express dissatisfaction when appropriate',
            'confused_elderly': 'Ask for clarification, may misunderstand terms, need patient help, be polite but confused',
            'angry_billing': 'Focus on billing issues, demand explanations, express frustration about charges',
            'new_user': 'Ask basic questions, show curiosity, may not understand terminology',
            'technical_expert': 'Use technical language, expect detailed answers, may challenge incorrect info',
            'happy_customer': 'Be polite, express gratitude, have reasonable expectations'
        };
        var behavior = personaBehaviors[personaType] || personaBehaviors['new_user'];
        return "You are simulating a ".concat(personaType.replace('_', ' '), " interacting with customer support.\n    \nCurrent turn: ").concat(turnCount + 1, "\nBehavioral guidelines: ").concat(behavior, "\n    \nImportant:\n- Stay completely in character\n- React naturally to the support responses\n- Express satisfaction when issues are resolved\n- Don't mention testing or break character\n- Use natural language appropriate to your persona");
    };
    /**
     * Original buildSystemMessage for existing conversation engine
     */
    LLMService.prototype.buildSystemMessage = function (context) {
        var systemPrompt = "You are simulating a customer interacting with a support chatbot for testing purposes.\n\nPersona: ".concat(context.persona, "\nCurrent turn: ").concat(context.currentTurn, "\nConversation goal: ").concat(context.conversationGoal || 'Get help with a support issue', "\n\nGuidelines:\n1. Stay in character as the specified persona\n2. Respond naturally to the chatbot's messages\n3. Ask follow-up questions when appropriate\n4. Show realistic customer behavior (frustration, confusion, satisfaction)\n5. Don't break character or mention that you're testing");
        if (context.lastForethoughtResponse) {
            systemPrompt += "\n\nThe support chatbot just said: \"".concat(context.lastForethoughtResponse, "\"");
        }
        return {
            role: 'system',
            content: systemPrompt
        };
    };
    /**
     * Convert conversation history to LLM messages
     */
    LLMService.prototype.convertHistoryToMessages = function (history) {
        var messages = [];
        history.forEach(function (turn) {
            if (turn.userMessage) {
                messages.push({ role: 'user', content: turn.userMessage });
            }
            if (turn.forethoughtResponse) {
                messages.push({ role: 'assistant', content: turn.forethoughtResponse });
            }
        });
        return messages;
    };
    /**
     * Check if conversation should end
     */
    LLMService.prototype.checkForConversationEnd = function (message) {
        var endPhrases = [
            'thank you',
            'thanks',
            'that helps',
            'problem solved',
            'issue resolved',
            'goodbye',
            'bye',
            'have a nice day',
            'appreciate your help',
            "that's all",
            'no more questions',
            'all set',
            'perfect'
        ];
        var lowerMessage = message.toLowerCase();
        return endPhrases.some(function (phrase) { return lowerMessage.includes(phrase); });
    };
    /**
     * Convert to OpenAI format
     */
    LLMService.prototype.convertToOpenAIFormat = function (messages) {
        return messages.map(function (message) { return (__assign({ role: message.role, content: message.content }, (message.name && { name: message.name }))); });
    };
    /**
     * Format OpenAI response
     */
    LLMService.prototype.formatResponse = function (completion, processingTime) {
        var _a, _b, _c;
        var choice = completion.choices[0];
        if (!choice || !choice.message) {
            throw new Error('Invalid response from OpenAI');
        }
        return {
            message: {
                role: choice.message.role,
                content: choice.message.content || ''
            },
            usage: {
                promptTokens: ((_a = completion.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens) || 0,
                completionTokens: ((_b = completion.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens) || 0,
                totalTokens: ((_c = completion.usage) === null || _c === void 0 ? void 0 : _c.total_tokens) || 0
            },
            finishReason: choice.finish_reason,
            processingTime: processingTime
        };
    };
    /**
     * Update usage metrics
     */
    LLMService.prototype.updateMetrics = function (response) {
        this.metrics.totalRequests++;
        this.metrics.totalTokens += response.usage.totalTokens;
        // Update average response time
        this.requestTimes.push(response.processingTime);
        if (this.requestTimes.length > 100) {
            this.requestTimes.shift(); // Keep only last 100 requests
        }
        this.metrics.averageResponseTime = this.requestTimes.reduce(function (a, b) { return a + b; }, 0) / this.requestTimes.length;
        // Estimate cost (rough calculation for GPT-4)
        var inputCostPer1k = 0.03;
        var outputCostPer1k = 0.06;
        var requestCost = (response.usage.promptTokens / 1000 * inputCostPer1k) +
            (response.usage.completionTokens / 1000 * outputCostPer1k);
        this.metrics.costEstimate += requestCost;
    };
    LLMService.prototype.getMetrics = function () {
        return __assign({}, this.metrics);
    };
    LLMService.prototype.validateApiKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.openai.models.list()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_2 = _a.sent();
                        console.error('OpenAI API key validation failed:', error_2);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LLMService.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.openai.models.list()];
                    case 1:
                        models = _a.sent();
                        return [2 /*return*/, models.data
                                .filter(function (model) { return model.id.includes('gpt'); })
                                .map(function (model) { return model.id; })
                                .sort()];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Failed to fetch available models:', error_3);
                        return [2 /*return*/, ['gpt-4-turbo-preview', 'gpt-3.5-turbo']];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return LLMService;
}());
exports.LLMService = LLMService;
