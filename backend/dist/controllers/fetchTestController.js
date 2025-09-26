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
exports.FetchTestController = void 0;
const fetchTestRunner_1 = require("../services/fetchTestRunner");
const fetchPersonas_1 = require("../config/fetchPersonas");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class FetchTestController {
    constructor() {
        this.activeTests = new Map();
        this.fetchTestRunner = new fetchTestRunner_1.FetchTestRunner();
    }
    /**
     * Start a Fetch-specific test suite
     */
    async startFetchTest(req, res) {
        try {
            const config = {
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
            // Start test in background
            const testPromise = this.fetchTestRunner.runFetchTestSuite(config);
            const testId = `fetch_${Date.now()}`;
            this.activeTests.set(testId, {
                promise: testPromise,
                config,
                startTime: new Date(),
                type: 'fetch_suite'
            });
            // Clean up after completion
            testPromise.then(report => {
                console.log(`Fetch test ${testId} completed`);
                this.activeTests.delete(testId);
            }).catch(error => {
                console.error(`Fetch test ${testId} failed:`, error);
                this.activeTests.delete(testId);
            });
            res.json({
                success: true,
                message: 'Fetch test suite started',
                testId,
                config,
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
    }
    /**
     * Get Fetch personas
     */
    async getFetchPersonas(req, res) {
        try {
            const category = req.query.category;
            const personas = category ?
                fetchPersonas_1.FETCH_PERSONAS.filter(p => p.category === category) :
                fetchPersonas_1.FETCH_PERSONAS;
            res.json({
                success: true,
                personas: personas.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    frustrationLevel: p.context.frustrationLevel,
                    samplePrompts: p.initialPrompts.slice(0, 2)
                }))
            });
        }
        catch (error) {
            console.error('Failed to get personas:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get personas'
            });
        }
    }
    /**
     * Get Fetch test scenarios
     */
    async getFetchScenarios(req, res) {
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
    }
    /**
     * Get Fetch categories
     */
    async getFetchCategories(req, res) {
        try {
            const categories = [
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
                categories
            });
        }
        catch (error) {
            console.error('Failed to get categories:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get categories'
            });
        }
    }
    /**
     * Get Fetch test reports with category breakdowns
     */
    async getFetchReports(req, res) {
        try {
            const reportPath = path.join(process.cwd(), 'test-reports');
            await fs.mkdir(reportPath, { recursive: true });
            const files = await fs.readdir(reportPath);
            const fetchReports = [];
            for (const file of files) {
                if (file.startsWith('fetch-test-') && file.endsWith('.json')) {
                    try {
                        const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
                        const report = JSON.parse(content);
                        fetchReports.push({
                            filename: file,
                            testId: report.testId,
                            startTime: report.startTime,
                            endTime: report.endTime,
                            categories: report.configuration.testCategories || [],
                            totalConversations: report.totalConversations,
                            successRate: report.successRate,
                            resolutionRate: report.fetchMetrics?.overallResolutionRate || 0,
                            avgResponseTime: report.averageResponseTime
                        });
                    }
                    catch (parseError) {
                        console.error(`Failed to parse report ${file}:`, parseError);
                    }
                }
            }
            res.json({
                success: true,
                reports: fetchReports.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            });
        }
        catch (error) {
            console.error('Failed to get Fetch reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get reports'
            });
        }
    }
    /**
     * Get detailed Fetch report
     */
    async getFetchReport(req, res) {
        try {
            const { reportId } = req.params;
            const reportPath = path.join(process.cwd(), 'test-reports');
            const files = await fs.readdir(reportPath);
            const reportFile = files.find(f => f.includes(reportId));
            if (!reportFile) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found'
                });
            }
            const content = await fs.readFile(path.join(reportPath, reportFile), 'utf-8');
            const report = JSON.parse(content);
            // Add summary statistics
            const summary = {
                totalConversations: report.totalConversations,
                successRate: report.successRate,
                resolutionRate: report.fetchMetrics?.overallResolutionRate || 0,
                avgTurnsToResolution: report.fetchMetrics?.averageTurnsToResolution || 0,
                categoryBreakdown: report.fetchMetrics?.byCategory || {},
                topIntents: report.commonIntents?.slice(0, 10) || [],
                commonErrors: report.errorSummary?.slice(0, 5) || []
            };
            res.json({
                success: true,
                report,
                summary
            });
        }
        catch (error) {
            console.error('Failed to get Fetch report:', error);
            res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }
    }
    /**
     * Estimate test duration
     */
    estimateTestDuration(config) {
        const totalConversations = config.testCategories.length * config.numberOfConversations;
        const avgTurnTime = config.delayBetweenTurns + 500; // Processing time
        const avgConversationTime = (config.maxTurnsPerConversation / 2) * avgTurnTime;
        const totalTime = totalConversations * (avgConversationTime + config.delayBetweenConversations);
        const minutes = Math.ceil(totalTime / 60000);
        return `${minutes} minutes`;
    }
}
exports.FetchTestController = FetchTestController;
//# sourceMappingURL=fetchTestController.js.map