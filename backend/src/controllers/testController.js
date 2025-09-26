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
exports.TestController = void 0;
var testRunner_1 = require("../services/testRunner");
var fs = require("fs/promises");
var path = require("path");
var TestController = /** @class */ (function () {
    function TestController() {
        this.activeTests = new Map();
        this.testRunner = new testRunner_1.AutonomousTestRunner();
    }
    /**
     * Start a new test cycle
     */
    TestController.prototype.startTestCycle = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var config, testPromise, testId_1;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    config = {
                        numberOfConversations: req.body.numberOfConversations || 10,
                        personaType: req.body.personaType || 'frustrated_customer',
                        maxTurnsPerConversation: req.body.maxTurnsPerConversation || 15,
                        delayBetweenTurns: req.body.delayBetweenTurns || 2000,
                        delayBetweenConversations: req.body.delayBetweenConversations || 5000
                    };
                    console.log('Starting test cycle with config:', config);
                    testPromise = this.testRunner.runTestCycle(config);
                    testId_1 = Date.now().toString();
                    // Store the promise so we can check status
                    this.activeTests.set(testId_1, {
                        promise: testPromise,
                        config: config,
                        startTime: new Date()
                    });
                    // Clean up after completion
                    testPromise.then(function (report) {
                        console.log("Test ".concat(testId_1, " completed successfully"));
                        _this.activeTests.delete(testId_1);
                    }).catch(function (error) {
                        console.error("Test ".concat(testId_1, " failed:"), error);
                        _this.activeTests.delete(testId_1);
                    });
                    res.json({
                        success: true,
                        message: 'Test cycle started',
                        testId: testId_1,
                        config: config
                    });
                }
                catch (error) {
                    console.error('Failed to start test cycle:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Failed to start test cycle'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get test status
     */
    TestController.prototype.getTestStatus = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var testId_2, activeTest, reportPath, files, testReport, err_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        testId_2 = req.params.testId;
                        activeTest = this.activeTests.get(testId_2);
                        if (!activeTest) return [3 /*break*/, 1];
                        res.json({
                            success: true,
                            status: 'running',
                            testId: testId_2,
                            config: activeTest.config,
                            startTime: activeTest.startTime
                        });
                        return [3 /*break*/, 5];
                    case 1:
                        reportPath = path.join(process.cwd(), 'test-reports');
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 3:
                        files = _a.sent();
                        testReport = files.find(function (f) { return f.includes(testId_2); });
                        if (testReport) {
                            res.json({
                                success: true,
                                status: 'completed',
                                testId: testId_2,
                                reportFile: testReport
                            });
                        }
                        else {
                            res.status(404).json({
                                success: false,
                                error: 'Test not found'
                            });
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        res.status(404).json({
                            success: false,
                            error: 'Test not found'
                        });
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('Failed to get test status:', error_1);
                        res.status(500).json({
                            success: false,
                            error: 'Failed to get test status'
                        });
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all test reports
     */
    TestController.prototype.getTestReports = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var reportPath, files, reports, _i, files_1, file, content, report, parseError_1, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        reportPath = path.join(process.cwd(), 'test-reports');
                        // Ensure directory exists
                        return [4 /*yield*/, fs.mkdir(reportPath, { recursive: true })];
                    case 1:
                        // Ensure directory exists
                        _b.sent();
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 2:
                        files = _b.sent();
                        reports = [];
                        _i = 0, files_1 = files;
                        _b.label = 3;
                    case 3:
                        if (!(_i < files_1.length)) return [3 /*break*/, 8];
                        file = files_1[_i];
                        if (!file.endsWith('.json')) return [3 /*break*/, 7];
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fs.readFile(path.join(reportPath, file), 'utf-8')];
                    case 5:
                        content = _b.sent();
                        report = JSON.parse(content);
                        reports.push({
                            filename: file,
                            testId: report.testId,
                            startTime: report.startTime,
                            endTime: report.endTime,
                            successRate: report.successRate,
                            totalConversations: report.totalConversations,
                            personaType: (_a = report.configuration) === null || _a === void 0 ? void 0 : _a.personaType
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
                            reports: reports.sort(function (a, b) {
                                return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
                            })
                        });
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _b.sent();
                        console.error('Failed to get test reports:', error_2);
                        res.status(500).json({
                            success: false,
                            error: 'Failed to get test reports'
                        });
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get specific test report
     */
    TestController.prototype.getTestReport = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var reportId_1, reportPath, files, reportFile, content, report, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        reportId_1 = req.params.reportId;
                        reportPath = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 1:
                        files = _a.sent();
                        reportFile = files.find(function (f) { return f.includes(reportId_1); });
                        if (!reportFile) {
                            return [2 /*return*/, res.status(404).json({
                                    success: false,
                                    error: 'Report not found'
                                })];
                        }
                        return [4 /*yield*/, fs.readFile(path.join(reportPath, reportFile), 'utf-8')];
                    case 2:
                        content = _a.sent();
                        report = JSON.parse(content);
                        res.json({
                            success: true,
                            report: report
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Failed to get test report:', error_3);
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
     * Get active tests
     */
    TestController.prototype.getActiveTests = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var activeTests;
            return __generator(this, function (_a) {
                try {
                    activeTests = Array.from(this.activeTests.entries()).map(function (_a) {
                        var id = _a[0], test = _a[1];
                        return ({
                            testId: id,
                            config: test.config,
                            startTime: test.startTime,
                            status: 'running'
                        });
                    });
                    res.json({
                        success: true,
                        activeTests: activeTests
                    });
                }
                catch (error) {
                    console.error('Failed to get active tests:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to get active tests'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Stop a running test
     */
    TestController.prototype.stopTest = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var testId, activeTest;
            return __generator(this, function (_a) {
                try {
                    testId = req.params.testId;
                    activeTest = this.activeTests.get(testId);
                    if (!activeTest) {
                        return [2 /*return*/, res.status(404).json({
                                success: false,
                                error: 'Test not found or already completed'
                            })];
                    }
                    // Note: In a real implementation, you'd need a way to cancel the promise
                    // For now, we'll just remove it from active tests
                    this.activeTests.delete(testId);
                    res.json({
                        success: true,
                        message: "Test ".concat(testId, " stopped")
                    });
                }
                catch (error) {
                    console.error('Failed to stop test:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to stop test'
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Delete a test report
     */
    TestController.prototype.deleteReport = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var reportId_2, reportPath, files, reportFile, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        reportId_2 = req.params.reportId;
                        reportPath = path.join(process.cwd(), 'test-reports');
                        return [4 /*yield*/, fs.readdir(reportPath)];
                    case 1:
                        files = _a.sent();
                        reportFile = files.find(function (f) { return f.includes(reportId_2); });
                        if (!reportFile) {
                            return [2 /*return*/, res.status(404).json({
                                    success: false,
                                    error: 'Report not found'
                                })];
                        }
                        return [4 /*yield*/, fs.unlink(path.join(reportPath, reportFile))];
                    case 2:
                        _a.sent();
                        res.json({
                            success: true,
                            message: 'Report deleted successfully'
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('Failed to delete report:', error_4);
                        res.status(500).json({
                            success: false,
                            error: 'Failed to delete report'
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TestController;
}());
exports.TestController = TestController;
