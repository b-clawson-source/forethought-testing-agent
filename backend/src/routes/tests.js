"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var testController_1 = require("../controllers/testController");
var router = (0, express_1.Router)();
var testController = new testController_1.TestController();
// Test cycle management
router.post('/start', function (req, res) { return testController.startTestCycle(req, res); });
router.get('/status/:testId', function (req, res) { return testController.getTestStatus(req, res); });
router.post('/stop/:testId', function (req, res) { return testController.stopTest(req, res); });
// Reports
router.get('/reports', function (req, res) { return testController.getTestReports(req, res); });
router.get('/reports/:reportId', function (req, res) { return testController.getTestReport(req, res); });
router.delete('/reports/:reportId', function (req, res) { return testController.deleteReport(req, res); });
// Active tests
router.get('/active', function (req, res) { return testController.getActiveTests(req, res); });
exports.default = router;
