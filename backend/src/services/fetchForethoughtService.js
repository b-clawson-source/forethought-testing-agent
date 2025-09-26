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
exports.FetchForethoughtService = void 0;
var axios_1 = require("axios");
var FetchForethoughtService = /** @class */ (function () {
    function FetchForethoughtService() {
        this.widgetApiKey = 'f633608a-e999-442a-8f94-312ec5ff33ae';
        this.widgetUrl = 'https://solve-widget.forethought.ai';
    }
    FetchForethoughtService.getInstance = function () {
        if (!FetchForethoughtService.instance) {
            FetchForethoughtService.instance = new FetchForethoughtService();
        }
        return FetchForethoughtService.instance;
    };
    /**
     * Process message through Forethought widget with Fetch-specific context
     */
    FetchForethoughtService.prototype.processMessage = function (message, category, userContext, sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, fetchData, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        fetchData = this.buildFetchDataAttributes(category, userContext);
                        return [4 /*yield*/, axios_1.default.post("".concat(this.widgetUrl, "/api/v1/conversations"), __assign({ message: message, api_key: this.widgetApiKey, session_id: sessionId }, fetchData), {
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                timeout: 15000
                            })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, this.parseResponse(response.data, Date.now() - startTime)];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Forethought widget error, using category-specific fallback:', error_1);
                        return [2 /*return*/, this.generateCategoryResponse(message, category, userContext, Date.now() - startTime)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Build Fetch-specific data attributes for Forethought
     */
    FetchForethoughtService.prototype.buildFetchDataAttributes = function (category, context) {
        var data = {
            'data-ft-Intent-Category': this.mapCategoryToIntent(category),
            'data-ft-ContactEntryPoint': 'Testing Agent',
            'data-ft-Language': 'English',
            'data-ft-Mobile-Platform': context.platform || 'Web'
        };
        // Add context-specific data
        if (context.userId)
            data['data-ft-UserId'] = context.userId;
        if (context.email)
            data['data-ft-Email'] = context.email;
        if (context.phone)
            data['data-ft-Phone'] = context.phone;
        if (context.receiptId)
            data['data-ft-ReceiptID'] = context.receiptId;
        if (context.transactionId)
            data['data-ft-TransactionId'] = context.transactionId;
        if (context.ticketId)
            data['data-ft-Ticket-ID'] = context.ticketId;
        if (context.storeName)
            data['data-ft-Store-Name'] = context.storeName;
        if (context.receiptTotal)
            data['data-ft-Receipt-Total'] = context.receiptTotal;
        if (context.referralCode)
            data['data-ft-Referral-Code'] = context.referralCode;
        if (context.offerCategory)
            data['data-ft-OfferCategory'] = context.offerCategory;
        return data;
    };
    /**
     * Map our categories to Forethought Intent Categories
     */
    FetchForethoughtService.prototype.mapCategoryToIntent = function (category) {
        var mapping = {
            'missing_points': 'Missing Points / Offers',
            'account_management': 'Account',
            'fetch_play': 'Fetch Play',
            'rewards_gift_cards': 'Rewards',
            'receipt_issues': 'Rejected Receipt',
            'ereceipt_scanning': 'eReceipts',
            'referral_issues': 'Referrals'
        };
        return mapping[category] || 'Account';
    };
    /**
     * Generate category-specific responses for testing
     */
    FetchForethoughtService.prototype.generateCategoryResponse = function (message, category, context, processingTime) {
        var lowerMessage = message.toLowerCase();
        var categoryResponses = {
            'missing_points': {
                intent: 'missing_points_receipts',
                confidence: 0.91,
                response: "I can help you with your missing points. Let me check your receipt details. Can you provide the receipt ID or store name and date of purchase?",
                actions: ['check_receipt_status', 'calculate_expected_points', 'review_offer_eligibility'],
                workflowTag: 'missing_points'
            },
            'account_management': {
                intent: 'account_help',
                confidence: 0.88,
                response: "I'll assist you with your account. What specific account issue are you experiencing? I can help with login issues, profile updates, or account settings.",
                actions: ['verify_account_status', 'check_security_settings', 'update_profile'],
                workflowTag: 'account'
            },
            'fetch_play': {
                intent: 'fetch_play_missing_points',
                confidence: 0.89,
                response: "I understand you have a question about Fetch Play. Are you missing points from a game or app, or do you need help with a specific game task?",
                actions: ['check_game_completion', 'verify_playtime', 'calculate_play_points'],
                workflowTag: 'fetch_play'
            },
            'rewards_gift_cards': {
                intent: 'rewards_redemption',
                confidence: 0.92,
                response: "I can help with rewards and gift cards. Are you trying to redeem points, or is there an issue with a reward you've already claimed?",
                actions: ['check_points_balance', 'verify_redemption_status', 'process_reward'],
                workflowTag: 'rewards'
            },
            'receipt_issues': {
                intent: 'rejected_receipt_help',
                confidence: 0.90,
                response: "I see you're having trouble with a receipt. Was your receipt rejected, or are you experiencing another issue? I can help troubleshoot the problem.",
                actions: ['review_rejection_reason', 'provide_receipt_guidelines', 'manual_review_request'],
                workflowTag: 'rejected_receipt'
            },
            'ereceipt_scanning': {
                intent: 'ereceipt_connection_help',
                confidence: 0.87,
                response: "I'll help you with eReceipt scanning. Are you having trouble connecting your email, or are certain eReceipts not appearing in your account?",
                actions: ['verify_email_connection', 'check_sync_status', 'troubleshoot_missing_ereceipts'],
                workflowTag: 'ereceipts'
            },
            'referral_issues': {
                intent: 'referrals_missing_bonus',
                confidence: 0.86,
                response: "I can help with your referral issue. Are you missing referral points, or is there a problem with your referral code?",
                actions: ['verify_referral_status', 'check_referral_requirements', 'calculate_referral_bonus'],
                workflowTag: 'referrals'
            }
        };
        var response = categoryResponses[category] || categoryResponses['account_management'];
        // Enhance response based on specific keywords
        if (lowerMessage.includes('points') && lowerMessage.includes('missing')) {
            response.confidence = Math.min(0.99, response.confidence + 0.05);
        }
        return {
            response: response.response,
            intent: response.intent,
            confidence: response.confidence,
            actions: response.actions,
            processingTime: processingTime,
            metadata: {
                sessionId: "session_".concat(Date.now()),
                workflowTag: response.workflowTag
            }
        };
    };
    /**
     * Parse Forethought widget response
     */
    FetchForethoughtService.prototype.parseResponse = function (data, processingTime) {
        return {
            response: data.message || data.response || 'How can I help you today?',
            intent: data.intent || 'unknown',
            confidence: data.confidence || 0.5,
            actions: data.actions || [],
            processingTime: processingTime,
            metadata: {
                workflowTag: data.workflow_tag,
                sessionId: data.session_id
            }
        };
    };
    return FetchForethoughtService;
}());
exports.FetchForethoughtService = FetchForethoughtService;
