"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testController_1 = require("../controllers/testController");
const router = (0, express_1.Router)();
const testController = new testController_1.TestController();
// Start a new test cycle
router.post('/start', (req, res) => testController.startTestCycle(req, res));
// Get test status
router.get('/status/:testId', (req, res) => testController.getTestStatus(req, res));
// Get all test reports
router.get('/reports', (req, res) => testController.getTestReports(req, res));
// Get specific test report
router.get('/reports/:reportId', (req, res) => testController.getTestReport(req, res));
// Get active tests
router.get('/active', (req, res) => testController.getActiveTests(req, res));
exports.default = router;
