"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testController_1 = require("../controllers/testController");
const router = (0, express_1.Router)();
const testController = new testController_1.TestController();
// Test cycle management
router.post('/start', (req, res) => testController.startTestCycle(req, res));
router.get('/status/:testId', (req, res) => testController.getTestStatus(req, res));
router.post('/stop/:testId', (req, res) => testController.stopTest(req, res));
// Reports
router.get('/reports', (req, res) => testController.getTestReports(req, res));
router.get('/reports/:reportId', (req, res) => testController.getTestReport(req, res));
router.delete('/reports/:reportId', (req, res) => testController.deleteReport(req, res));
// Active tests
router.get('/active', (req, res) => testController.getActiveTests(req, res));
exports.default = router;
//# sourceMappingURL=tests.js.map