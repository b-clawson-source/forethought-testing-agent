"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestController = void 0;
const testRunner_1 = require("../services/testRunner");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class TestController {
    constructor() {
        this.activeTests = new Map();
        this.testRunner = new testRunner_1.AutonomousTestRunner();
    }
    /**
     * Start a new test cycle
     */
    async startTestCycle(req, res) {
        try {
            const config = {
                numberOfConversations: req.body.numberOfConversations || 10,
                personaType: req.body.personaType || 'frustrated_customer',
                maxTurnsPerConversation: req.body.maxTurnsPerConversation || 15,
                delayBetweenTurns: req.body.delayBetweenTurns || 2000,
                delayBetweenConversations: req.body.delayBetweenConversations || 5000
            };
            // Start test in background
            const testPromise = this.testRunner.runTestCycle(config);
            // Store the promise so we can check status
            const testId = Date.now().toString();
            this.activeTests.set(testId, {
                promise: testPromise,
                config,
                startTime: new Date()
            });
            // Clean up after completion
            testPromise.then(report => {
                this.activeTests.delete(testId);
            }).catch(error => {
                console.error(`Test ${testId} failed:`, error);
                this.activeTests.delete(testId);
            });
            res.json({
                success: true,
                message: 'Test cycle started',
                testId,
                config
            });
        }
        catch (error) {
            console.error('Failed to start test cycle:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start test cycle'
            });
        }
    }
    /**
     * Get test status
     */
    async getTestStatus(req, res) {
        try {
            const { testId } = req.params;
            const activeTest = this.activeTests.get(testId);
            if (activeTest) {
                res.json({
                    success: true,
                    status: 'running',
                    testId,
                    config: activeTest.config,
                    startTime: activeTest.startTime
                });
            }
            else {
                // Check if test report exists
                const reportPath = path.join(process.cwd(), 'test-reports');
                const files = await fs.readdir(reportPath);
                const testReport = files.find(f => f.includes(testId));
                if (testReport) {
                    res.json({
                        success: true,
                        status: 'completed',
                        testId,
                        reportFile: testReport
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        error: 'Test not found'
                    });
                }
            }
        }
        catch (error) {
            console.error('Failed to get test status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get test status'
            });
        }
    }
    /**
     * Get all test reports
     */
    async getTestReports(req, res) {
        try {
            const reportPath = path.join(process.cwd(), 'test-reports');
            // Ensure directory exists
            await fs.mkdir(reportPath, { recursive: true });
            const files = await fs.readdir(reportPath);
            const reports = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
                    const report = JSON.parse(content);
                    reports.push({
                        filename: file,
                        testId: report.testId,
                        startTime: report.startTime,
                        endTime: report.endTime,
                        successRate: report.successRate,
                        totalConversations: report.totalConversations
                    });
                }
            }
            res.json({
                success: true,
                reports: reports.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            });
        }
        catch (error) {
            console.error('Failed to get test reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get test reports'
            });
        }
    }
    /**
     * Get specific test report
     */
    async getTestReport(req, res) {
        try {
            const { reportId } = req.params;
            const reportPath = path.join(process.cwd(), 'test-reports', `${reportId}.json`);
            const content = await fs.readFile(reportPath, 'utf-8');
            const report = JSON.parse(content);
            res.json({
                success: true,
                report
            });
        }
        catch (error) {
            console.error('Failed to get test report:', error);
            res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }
    }
    /**
     * Get active tests
     */
    async getActiveTests(req, res) {
        try {
            const activeTests = Array.from(this.activeTests.entries()).map(([id, test]) => ({
                testId: id,
                config: test.config,
                startTime: test.startTime,
                status: 'running'
            }));
            res.json({
                success: true,
                activeTests
            });
        }
        catch (error) {
            console.error('Failed to get active tests:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get active tests'
            });
        }
    }
}
exports.TestController = TestController;
