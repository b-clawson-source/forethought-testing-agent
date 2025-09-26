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
exports.ConversationEngine = void 0;
var uuid_1 = require("uuid");
var llmService_1 = require("./llmService");
var databaseService_1 = require("./databaseService");
var forethoughtService_1 = require("./forethoughtService");
var ConversationEngine = /** @class */ (function () {
    function ConversationEngine() {
        this.llmService = llmService_1.LLMService.getInstance();
        this.forethoughtService = forethoughtService_1.ForethoughtService.getInstance();
        this.activeSessions = new Map();
    }
    ConversationEngine.getInstance = function () {
        if (!ConversationEngine.instance) {
            ConversationEngine.instance = new ConversationEngine();
        }
        return ConversationEngine.instance;
    };
    ConversationEngine.prototype.startConversation = function (initialPrompt, persona, config) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionId, fullConfig, session, t;
            var _this = this;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        sessionId = (0, uuid_1.v4)();
                        fullConfig = __assign({ maxTurns: parseInt((_a = process.env.MAX_CONVERSATION_TURNS) !== null && _a !== void 0 ? _a : '6', 10), timeoutMs: parseInt((_b = process.env.CONVERSATION_TIMEOUT_MS) !== null && _b !== void 0 ? _b : '300000', 10), llmModel: (_c = process.env.OPENAI_MODEL) !== null && _c !== void 0 ? _c : 'gpt-4-turbo-preview', temperature: Number((_d = process.env.OPENAI_TEMPERATURE) !== null && _d !== void 0 ? _d : '0.7'), enablePolicyValidation: true, enableIntentTracking: true, enableActionValidation: true }, config);
                        session = {
                            id: sessionId,
                            initialPrompt: initialPrompt,
                            persona: persona,
                            // If enum:
                            // status: ConversationStatus.Pending,
                            status: 'pending',
                            messages: [],
                            startTime: new Date(),
                            configuration: fullConfig
                        };
                        return [4 /*yield*/, this.saveSession(session)];
                    case 1:
                        _e.sent();
                        this.activeSessions.set(sessionId, session);
                        console.log("Started conversation ".concat(sessionId, " with persona: ").concat(persona));
                        t = setTimeout(function () { return _this.generateInitialUserMessage(session); }, 500);
                        if ('unref' in t && typeof t.unref === 'function')
                            t.unref();
                        return [2 /*return*/, session];
                }
            });
        });
    };
    ConversationEngine.prototype.generateInitialUserMessage = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var context, llmResponse, userMessage, t, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        context = {
                            sessionId: session.id,
                            persona: session.persona,
                            currentTurn: 0,
                            conversationGoal: session.initialPrompt
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 7]);
                        return [4 /*yield*/, this.llmService.generateConversationResponse([], context, {
                                temperature: session.configuration.temperature,
                                model: session.configuration.llmModel
                            })];
                    case 2:
                        llmResponse = _a.sent();
                        userMessage = {
                            id: (0, uuid_1.v4)(),
                            role: 'user',
                            content: llmResponse.message.content,
                            timestamp: new Date(),
                            metadata: { processingTime: llmResponse.processingTime }
                        };
                        session.messages.push(userMessage);
                        // If enum:
                        // session.status = ConversationStatus.Active;
                        session.status = 'active';
                        return [4 /*yield*/, this.saveMessage(session.id, userMessage)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.updateSessionStatus(session.id, session.status)];
                    case 4:
                        _a.sent();
                        console.log("Generated initial message for ".concat(session.id, ": ").concat(userMessage.content.substring(0, 50), "..."));
                        t = setTimeout(function () { return _this.processNextTurn(session.id); }, 1000);
                        if ('unref' in t && typeof t.unref === 'function')
                            t.unref();
                        return [3 /*break*/, 7];
                    case 5:
                        error_1 = _a.sent();
                        console.error('Failed to generate initial user message:', error_1);
                        // If enum:
                        // session.status = ConversationStatus.Failed;
                        session.status = 'failed';
                        return [4 /*yield*/, this.updateSessionStatus(session.id, session.status)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ConversationEngine.prototype.processNextTurn = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, lastMessage, forethoughtResponse, assistantMessage, t, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        session = this.activeSessions.get(sessionId);
                        if (!session || session.status !== 'active')
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 9]);
                        lastMessage = session.messages[session.messages.length - 1];
                        if (!(lastMessage.role === 'user')) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.forethoughtService.processMessage(lastMessage.content, sessionId)];
                    case 2:
                        forethoughtResponse = _a.sent();
                        assistantMessage = {
                            id: (0, uuid_1.v4)(),
                            role: 'assistant',
                            content: forethoughtResponse.response,
                            timestamp: new Date(),
                            metadata: {
                                intent: forethoughtResponse.intent,
                                confidence: forethoughtResponse.confidence,
                                actions: forethoughtResponse.actions,
                                processingTime: forethoughtResponse.processingTime
                            }
                        };
                        session.messages.push(assistantMessage);
                        return [4 /*yield*/, this.saveMessage(sessionId, assistantMessage)];
                    case 3:
                        _a.sent();
                        console.log("Assistant response for ".concat(sessionId, ": ").concat(forethoughtResponse.intent, " (").concat(forethoughtResponse.confidence, ")"));
                        if (!(session.messages.length < session.configuration.maxTurns)) return [3 /*break*/, 4];
                        t = setTimeout(function () { return _this.generateNextUserMessage(session); }, 2000);
                        if ('unref' in t && typeof t.unref === 'function')
                            t.unref();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.endConversation(sessionId)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        error_2 = _a.sent();
                        console.error("Error processing turn for ".concat(sessionId, ":"), error_2);
                        return [4 /*yield*/, this.endConversation(sessionId)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // ... (rest unchanged except applying the same patterns for catch: unknown, timers, and enum-safe statuses)
    ConversationEngine.prototype.getAllSessions = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var db, sessionRows, error_3;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, databaseService_1.DatabaseService.getInstance().getDatabase()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.all("\n        SELECT * FROM conversation_sessions \n        ORDER BY start_time DESC \n        LIMIT ?\n        ", [limit])];
                    case 2:
                        sessionRows = _a.sent();
                        return [2 /*return*/, sessionRows.map(function (row) { return ({
                                id: row.id,
                                initialPrompt: row.initial_prompt,
                                persona: row.persona,
                                status: row.status,
                                messages: [],
                                startTime: new Date(row.start_time),
                                endTime: row.end_time ? new Date(row.end_time) : undefined,
                                configuration: JSON.parse(row.configuration),
                                analysis: row.analysis ? JSON.parse(row.analysis) : undefined
                            }); })];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Failed to get all sessions:', error_3);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return ConversationEngine;
}());
exports.ConversationEngine = ConversationEngine;
