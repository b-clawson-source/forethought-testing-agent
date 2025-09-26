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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationController = void 0;
var forethoughtService_1 = require("../services/forethoughtService");
var openai_1 = require("openai");
// Initialize services
var forethoughtService = new forethoughtService_1.ForethoughtService();
var openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Store active conversations
var activeConversations = new Map();
var ConversationController = /** @class */ (function () {
    function ConversationController() {
    }
    /**
     * Handle message in conversation - THIS IS THE KEY ENDPOINT TO FIX
     */
    ConversationController.sendMessage = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, message, sessionId, currentSessionId, forethoughtResponse, conversation, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, message = _a.message, sessionId = _a.sessionId;
                        if (!message) {
                            return [2 /*return*/, res.status(400).json({
                                    error: 'Message is required'
                                })];
                        }
                        currentSessionId = sessionId || "session-".concat(Date.now());
                        console.log("[CONVERSATION] Incoming message: \"".concat(message, "\""));
                        return [4 /*yield*/, forethoughtService.sendMessage(message, currentSessionId)];
                    case 1:
                        forethoughtResponse = _b.sent();
                        console.log("[CONVERSATION] Forethought response: \"".concat(forethoughtResponse.response, "\""));
                        console.log("[CONVERSATION] Intent: ".concat(forethoughtResponse.intent, " (").concat(forethoughtResponse.confidence, "% confidence)"));
                        // Store conversation in memory
                        if (!activeConversations.has(currentSessionId)) {
                            activeConversations.set(currentSessionId, {
                                sessionId: currentSessionId,
                                messages: [],
                                startTime: new Date()
                            });
                        }
                        conversation = activeConversations.get(currentSessionId);
                        // Add customer message
                        conversation.messages.push({
                            role: 'user',
                            content: message,
                            timestamp: new Date()
                        });
                        // Add agent response
                        conversation.messages.push({
                            role: 'assistant',
                            content: forethoughtResponse.response,
                            timestamp: new Date(),
                            metadata: {
                                intent: forethoughtResponse.intent,
                                confidence: forethoughtResponse.confidence,
                                suggestedActions: forethoughtResponse.suggestedActions,
                                knowledgeBaseArticles: forethoughtResponse.knowledgeBaseArticles
                            }
                        });
                        // Return response in the format your system expects
                        res.json({
                            success: true,
                            response: forethoughtResponse.response,
                            message: forethoughtResponse.response, // For backward compatibility
                            intent: forethoughtResponse.intent,
                            confidence: forethoughtResponse.confidence,
                            sessionId: currentSessionId,
                            suggestedActions: forethoughtResponse.suggestedActions,
                            knowledgeBaseArticles: forethoughtResponse.knowledgeBaseArticles,
                            conversationLength: conversation.messages.length
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        console.error('[CONVERSATION] Error:', error_1);
                        res.status(500).json({
                            success: false,
                            error: 'Failed to process message',
                            details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start freeform conversation with OpenAI customer simulation
     */
    ConversationController.startFreeformConversation = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, query, _b, maxTurns, _c, persona, conversationId, currentMessage, turnCount, conversation, forethoughtResponse, shouldEnd, error_2;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 6, , 7]);
                        _a = req.body, query = _a.query, _b = _a.maxTurns, maxTurns = _b === void 0 ? 10 : _b, _c = _a.persona, persona = _c === void 0 ? 'polite' : _c;
                        if (!query) {
                            return [2 /*return*/, res.status(400).json({
                                    error: 'Initial query is required'
                                })];
                        }
                        conversationId = "freeform-".concat(Date.now());
                        currentMessage = query;
                        turnCount = 0;
                        conversation = {
                            id: conversationId,
                            messages: [],
                            resolved: false,
                            persona: persona
                        };
                        console.log("[FREEFORM] Starting conversation with persona: ".concat(persona));
                        console.log("[FREEFORM] Initial query: \"".concat(query, "\""));
                        _f.label = 1;
                    case 1:
                        if (!(turnCount < maxTurns)) return [3 /*break*/, 5];
                        turnCount++;
                        // Customer message
                        conversation.messages.push({
                            role: 'user',
                            content: currentMessage,
                            timestamp: new Date(),
                            turn: turnCount
                        });
                        console.log("[FREEFORM] Turn ".concat(turnCount, " - Customer: \"").concat(currentMessage, "\""));
                        return [4 /*yield*/, forethoughtService.sendMessage(currentMessage, conversationId)];
                    case 2:
                        forethoughtResponse = _f.sent();
                        console.log("[FREEFORM] Turn ".concat(turnCount, " - Agent: \"").concat(forethoughtResponse.response, "\""));
                        console.log("[FREEFORM] Intent: ".concat(forethoughtResponse.intent, " (").concat(forethoughtResponse.confidence, "% confidence)"));
                        // Agent response
                        conversation.messages.push({
                            role: 'assistant',
                            content: forethoughtResponse.response,
                            timestamp: new Date(),
                            turn: turnCount,
                            metadata: {
                                intent: forethoughtResponse.intent,
                                confidence: forethoughtResponse.confidence,
                                suggestedActions: forethoughtResponse.suggestedActions
                            }
                        });
                        return [4 /*yield*/, ConversationController.shouldEndConversation(conversation.messages, persona)];
                    case 3:
                        shouldEnd = _f.sent();
                        if (shouldEnd.shouldEnd) {
                            conversation.resolved = shouldEnd.resolved;
                            console.log("[FREEFORM] Conversation ended: ".concat(shouldEnd.reason));
                            return [3 /*break*/, 5];
                        }
                        return [4 /*yield*/, ConversationController.generateCustomerResponse(conversation.messages, persona, forethoughtResponse.response)];
                    case 4:
                        // Generate next customer message using OpenAI
                        currentMessage = _f.sent();
                        if (!currentMessage) {
                            console.log("[FREEFORM] Customer ended conversation (no response generated)");
                            conversation.resolved = true;
                            return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 1];
                    case 5:
                        // Store conversation
                        activeConversations.set(conversationId, conversation);
                        res.json({
                            success: true,
                            conversationId: conversationId,
                            totalTurns: conversation.messages.length,
                            resolved: conversation.resolved,
                            messages: conversation.messages,
                            summary: {
                                persona: persona,
                                turns: Math.ceil(conversation.messages.length / 2),
                                resolved: conversation.resolved,
                                finalIntent: (_e = (_d = conversation.messages[conversation.messages.length - 1]) === null || _d === void 0 ? void 0 : _d.metadata) === null || _e === void 0 ? void 0 : _e.intent
                            }
                        });
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _f.sent();
                        console.error('[FREEFORM] Error:', error_2);
                        res.status(500).json({
                            error: 'Failed to start freeform conversation',
                            details: error_2 instanceof Error ? error_2.message : 'Unknown error'
                        });
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate customer response using OpenAI
     */
    ConversationController.generateCustomerResponse = function (messages, persona, lastAgentResponse) {
        return __awaiter(this, void 0, void 0, function () {
            var fallbackResponses, responses, conversationContext, personaDescriptions, prompt_1, completion, response, error_3;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!process.env.OPENAI_API_KEY) {
                            fallbackResponses = {
                                frustrated: ["This is taking too long!", "I need this fixed now!", "This is ridiculous!"],
                                confused: ["I don't understand", "Can you explain that better?", "What does that mean?"],
                                polite: ["Thank you for your help", "I appreciate your assistance", "That makes sense"],
                                impatient: ["Just tell me how to fix it", "I don't have time for this", "Give me the quick solution"],
                                technical: ["What's the root cause?", "Can you provide more technical details?", "Is this a known issue?"]
                            };
                            responses = fallbackResponses[persona] || fallbackResponses.polite;
                            return [2 /*return*/, responses[Math.floor(Math.random() * responses.length)]];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        conversationContext = messages
                            .slice(-6) // Last 3 exchanges
                            .map(function (m) { return "".concat(m.role === 'user' ? 'Customer' : 'Agent', ": ").concat(m.content); })
                            .join('\n');
                        personaDescriptions = {
                            frustrated: "You are a frustrated customer who has been dealing with this issue for a while. You're impatient and want quick solutions.",
                            confused: "You are a confused customer who doesn't understand technical terms. You ask clarifying questions and need simple explanations.",
                            polite: "You are a polite, courteous customer. You're patient and appreciative of help.",
                            impatient: "You are a busy customer who wants quick solutions without long explanations.",
                            technical: "You are a tech-savvy customer who understands technical details and wants specific information."
                        };
                        prompt_1 = "".concat(personaDescriptions[persona] || personaDescriptions.polite, "\n\nRecent conversation:\n").concat(conversationContext, "\n\nAgent just said: \"").concat(lastAgentResponse, "\"\n\nGenerate your next realistic response as a customer. Your response should:\n1. Match your persona (").concat(persona, ")\n2. Respond appropriately to what the agent said\n3. Either continue the conversation if not satisfied, or thank them if the issue seems resolved\n4. Be 1-2 sentences maximum\n5. Sound like a real customer would speak\n\nIf the agent provided a good solution and you're satisfied, express thanks and indicate the issue is resolved.\nIf not satisfied, continue asking questions or expressing concerns appropriate to your persona.\n\nCustomer response:");
                        return [4 /*yield*/, openai.chat.completions.create({
                                model: "gpt-4",
                                messages: [{ role: "user", content: prompt_1 }],
                                max_tokens: 150,
                                temperature: 0.7,
                            })];
                    case 2:
                        completion = _d.sent();
                        response = ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                        // Don't continue if customer seems satisfied
                        if (response.toLowerCase().includes('thank') &&
                            (response.toLowerCase().includes('help') || response.toLowerCase().includes('resolve'))) {
                            return [2 /*return*/, ''];
                        }
                        return [2 /*return*/, response];
                    case 3:
                        error_3 = _d.sent();
                        console.error('[OPENAI] Error generating customer response:', error_3);
                        return [2 /*return*/, '']; // End conversation on error
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Determine if conversation should end
     */
    ConversationController.shouldEndConversation = function (messages, persona) {
        return __awaiter(this, void 0, void 0, function () {
            var lastCustomerMessage, lastAgentMessage;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                lastCustomerMessage = ((_b = (_a = messages
                    .filter(function (m) { return m.role === 'user'; })
                    .pop()) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
                lastAgentMessage = ((_d = (_c = messages
                    .filter(function (m) { return m.role === 'assistant'; })
                    .pop()) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.toLowerCase()) || '';
                // Check for satisfaction indicators
                if (lastCustomerMessage.includes('thank') &&
                    (lastCustomerMessage.includes('help') || lastCustomerMessage.includes('resolve'))) {
                    return [2 /*return*/, { shouldEnd: true, resolved: true, reason: 'Customer expressed satisfaction' }];
                }
                // Check for resolution indicators in agent response
                if (lastAgentMessage.includes('resolved') ||
                    lastAgentMessage.includes('completed') ||
                    lastAgentMessage.includes('fixed')) {
                    return [2 /*return*/, { shouldEnd: false, resolved: false, reason: 'Continue to confirm resolution' }];
                }
                // Persona-specific ending conditions
                if (persona === 'frustrated' && messages.length > 8) {
                    return [2 /*return*/, { shouldEnd: true, resolved: false, reason: 'Frustrated customer patience expired' }];
                }
                if (persona === 'impatient' && messages.length > 6) {
                    return [2 /*return*/, { shouldEnd: true, resolved: false, reason: 'Impatient customer gave up' }];
                }
                // General conversation length limits
                if (messages.length > 16) {
                    return [2 /*return*/, { shouldEnd: true, resolved: false, reason: 'Maximum conversation length reached' }];
                }
                return [2 /*return*/, { shouldEnd: false, resolved: false, reason: 'Continue conversation' }];
            });
        });
    };
    /**
     * Get conversation by session ID
     */
    ConversationController.getConversation = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionId, conversation;
            return __generator(this, function (_a) {
                try {
                    sessionId = req.params.sessionId;
                    conversation = activeConversations.get(sessionId);
                    if (!conversation) {
                        return [2 /*return*/, res.status(404).json({
                                error: 'Conversation not found'
                            })];
                    }
                    res.json({
                        success: true,
                        conversation: conversation
                    });
                }
                catch (error) {
                    console.error('[CONVERSATION] Get conversation error:', error);
                    res.status(500).json({
                        error: 'Failed to get conversation'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get all conversations
     */
    ConversationController.getConversations = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var conversations;
            return __generator(this, function (_a) {
                try {
                    conversations = Array.from(activeConversations.values());
                    res.json({
                        success: true,
                        conversations: conversations,
                        total: conversations.length
                    });
                }
                catch (error) {
                    console.error('[CONVERSATION] Get conversations error:', error);
                    res.status(500).json({
                        error: 'Failed to get conversations'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Test Forethought connectivity
     */
    ConversationController.testForethought = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var testResult, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[TEST] Testing Forethought connectivity...');
                        return [4 /*yield*/, forethoughtService.testConnectivity()];
                    case 1:
                        testResult = _a.sent();
                        res.json(__assign({ success: testResult.success }, testResult));
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        console.error('[TEST] Forethought test error:', error_4);
                        res.status(500).json({
                            success: false,
                            error: 'Forethought test failed',
                            details: error_4 instanceof Error ? error_4.message : 'Unknown error'
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ConversationController;
}());
exports.ConversationController = ConversationController;
