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
exports.FetchTestController = void 0;
var fetchTestRunner_1 = require("../services/fetchTestRunner");
var fetchPersonas_1 = require("../config/fetchPersonas");
var fs = require("fs/promises");
var path = require("path");
var FetchTestController = /** @class */ (function () {
    function FetchTestController() {
        this.activeTests = new Map();
        this.fetchTestRunner = new fetchTestRunner_1.FetchTestRunner();
    }
    /**
     * Start a Fetch-specific test suite
     */
    FetchTestController.prototype.startFetchTest = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var config, testPromise, testId_1;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    config = {
                        numberOfConversations: req.body.conversationsPerCategory || 3,
                        personaType: 'fetch_mixed', // Will use multiple personas
                        maxTurnsPerConversation: req.body.maxTurns || 12,
                        delayBetweenTurns: req.body.delayBetweenTurns || 2000,
                        delayBetweenConversations: req.body.delayBetweenConversations || 3000,
                        testCategories: req.body.categories || [
                            'missing_points',
                            'account_management',
                            'fetch_play',
                            'rewards_gift_cards',
                            'receipt_issues',
                            'ereceipt_scanning',
                            'referral_issues'
                        ],
                        useRealWidget: req.body.useRealWidget || false,
                        includeEdgeCases: req.body.includeEdgeCases || false
                    };
                    console.log('Starting Fetch test suite with config:', config);
                    testPromise = this.fetchTestRunner.runFetchTestSuite(config);
                    testId_1 = "fetch_".concat(Date.now());
                    this.activeTests.set(testId_1, {
                        promise: testPromise,
                        config: config,
                        startTime: new Date(),
                        type: 'fetch_suite'
                    });
                    // Clean up after completion
                    testPromise.then(function (report) {
                        console.log("Fetch test ".concat(testId_1, " completed"));
                        _this.activeTests.delete(testId_1);
                    }).catch(function (error) {
                        console.error("Fetch test ".concat(testId_1, " failed:"), error);
                        _this.activeTests.delete(testId_1);
                    });
                    res.json({
                        success: true,
                        message: 'Fetch test suite started',
                        testId: testId_1,
                        config: config,
                        estimatedDuration: this.estimateTestDuration(config)
                    });
                }
                catch (error) {
                    console.error('Failed to start Fetch test:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Failed to start test'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get Fetch personas
     */
    FetchTestController.prototype.getFetchPersonas = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var category_1, personas;
            return __generator(this, function (_a) {
                try {
                    category_1 = req.query.category;
                    personas = category_1 ?
                        fetchPersonas_1.FETCH_PERSONAS.filter(function (p) { return p.category === category_1; }) :
                        fetchPersonas_1.FETCH_PERSONAS;
                    res.json({
                        success: true,
                        personas: personas.map(function (p) { return ({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            category: p.category,
                            frustrationLevel: p.context.frustrationLevel,
                            samplePrompts: p.initialPrompts.slice(0, 2)
                        }); })
                    });
                }
                catch (error) {
                    console.error('Failed to get personas:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to get personas'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get Fetch test scenarios
     */
    FetchTestController.prototype.getFetchScenarios = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    res.json({
                        success: true,
                        scenarios: fetchPersonas_1.FETCH_TEST_SCENARIOS
                    });
                }
                catch (error) {
                    console.error('Failed to get scenarios:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to get scenarios'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get Fetch categories
     */
    FetchTestController.prototype.getFetchCategories = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var categories;
            return __generator(this, function (_a) {
                try {
                    categories = [
                        {
                            id: 'missing_points',
                            name: 'Missing Points',
                            description: 'Points not credited from receipts, offers, or bonuses',
                            commonIssues: ['Sign-up bonus', 'Offer points', 'Receipt points']
                        },
                        {
                            id: 'account_management',
                            name: 'Account Management',
                            description: 'Login issues, profile updates, account access',
                            commonIssues: ['Locked account', 'Phone change', 'Email update']
                        },
                        {
                            id: 'fetch_play',
                            name: 'Fetch Play',
                            description: 'Game and app completion tracking issues',
                            commonIssues: ['Game not tracked', 'Playtime missing', 'App points']
                        },
                        {
                            id: 'rewards_gift_cards',
                            name: 'Rewards & Gift Cards',
                            description: 'Redemption and delivery issues',
                            commonIssues: ['Delayed delivery', 'Wrong reward', 'Missing email']
                        },
                        {
                            id: 'receipt_issues',
                            name: 'Receipt Issues',
                            description: 'Receipt rejection and quality problems',
                            commonIssues: ['Blurry rejection', 'Invalid receipt', 'Missing items']
                        },
                        {
                            id: 'ereceipt_scanning',
                            name: 'eReceipt Scanning',
                            description: 'Email connection and sync issues',
                            commonIssues: ['Email not syncing', 'Missing eReceipts', 'Connection failed']
                        },
                        {
                            id: 'referral_issues',
                            name: 'Referral Issues',
                            description: 'Referral credit and code problems',
                            commonIssues: ['Missing referral bonus', 'Code not working', 'Friend not credited']
                        }
                    ];
                    res.json({
                        success: true,
                        categories: categories
                    });
                }
                catch (error) {
                    console.error('Failed to get categories:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to get categories'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get Fetch test reports with category breakdowns
     */
    FetchTestController.prototype.getFetchReports = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var reportPath, files, fetchReports, _i, files_1, file, content, report, parseError_1, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        reportPath = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.mkdir(reportPath, { recursive: true })];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 2:
                        files = _b.sent();
                        fetchReports = [];
                        _i = 0, files_1 = files;
                        _b.label = 3;
                    case 3:
                        if (!(_i < files_1.length)) return [3 /*break*/, 8];
                        file = files_1[_i];
                        if (!(file.startsWith('fetch-test-') && file.endsWith('.json'))) return [3 /*break*/, 7];
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fs.readFile(path.join(reportPath, file), 'utf-8')];
                    case 5:
                        content = _b.sent();
                        report = JSON.parse(content);
                        fetchReports.push({
                            filename: file,
                            testId: report.testId,
                            startTime: report.startTime,
                            endTime: report.endTime,
                            categories: report.configuration.testCategories || [],
                            totalConversations: report.totalConversations,
                            successRate: report.successRate,
                            resolutionRate: ((_a = report.fetchMetrics) === null || _a === void 0 ? void 0 : _a.overallResolutionRate) || 0,
                            avgResponseTime: report.averageResponseTime
                        });
                        return [3 /*break*/, 7];
                    case 6:
                        parseError_1 = _b.sent();
                        console.error("Failed to parse report ".concat(file, ":"), parseError_1);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8:
                        res.json({
                            success: true,
                            reports: fetchReports.sort(function (a, b) {
                                return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
                            })
                        });
                        return [3 /*break*/, 10];
                    case 9:
                        error_1 = _b.sent();
                        console.error('Failed to get Fetch reports:', error_1);
                        res.status(500).json({
                            success: false,
                            error: 'Failed to get reports'
                        });
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get detailed Fetch report
     */
    FetchTestController.prototype.getFetchReport = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var reportId_1, reportPath, files, reportFile, content, report, summary, error_2;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 3, , 4]);
                        reportId_1 = req.params.reportId;
                        reportPath = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 1:
                        files = _f.sent();
                        reportFile = files.find(function (f) { return f.includes(reportId_1); });
                        if (!reportFile) {
                            return [2 /*return*/, res.status(404).json({
                                    success: false,
                                    error: 'Report not found'
                                })];
                        }
                        return [4 /*yield*/, fs.readFile(path.join(reportPath, reportFile), 'utf-8')];
                    case 2:
                        content = _f.sent();
                        report = JSON.parse(content);
                        summary = {
                            totalConversations: report.totalConversations,
                            successRate: report.successRate,
                            resolutionRate: ((_a = report.fetchMetrics) === null || _a === void 0 ? void 0 : _a.overallResolutionRate) || 0,
                            avgTurnsToResolution: ((_b = report.fetchMetrics) === null || _b === void 0 ? void 0 : _b.averageTurnsToResolution) || 0,
                            categoryBreakdown: ((_c = report.fetchMetrics) === null || _c === void 0 ? void 0 : _c.byCategory) || {},
                            topIntents: ((_d = report.commonIntents) === null || _d === void 0 ? void 0 : _d.slice(0, 10)) || [],
                            commonErrors: ((_e = report.errorSummary) === null || _e === void 0 ? void 0 : _e.slice(0, 5)) || []
                        };
                        res.json({
                            success: true,
                            report: report,
                            summary: summary
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _f.sent();
                        console.error('Failed to get Fetch report:', error_2);
                        res.status(404).json({
                            success: false,
                            error: 'Report not found'
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Estimate test duration
     */
    FetchTestController.prototype.estimateTestDuration = function (config) {
        var totalConversations = config.testCategories.length * config.numberOfConversations;
        var avgTurnTime = config.delayBetweenTurns + 500; // Processing time
        var avgConversationTime = (config.maxTurnsPerConversation / 2) * avgTurnTime;
        var totalTime = totalConversations * (avgConversationTime + config.delayBetweenConversations);
        var minutes = Math.ceil(totalTime / 60000);
        return "".concat(minutes, " minutes");
    };
    return FetchTestController;
}());
exports.FetchTestController = FetchTestController;
