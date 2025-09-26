"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autonomousTestRoutes = void 0;
var express_1 = require("express");
var autonomousTestController_1 = require("../controllers/autonomousTestController");
var router = (0, express_1.Router)();
exports.autonomousTestRoutes = router;
var controller = new autonomousTestController_1.AutonomousTestController();
/**
 * @route POST /api/autonomous-tests
 * @desc Start a new autonomous conversation test cycle
 * @body {
 *   initialPrompt: string,
 *   conversationCount?: number (default: 10),
 *   maxTurns?: number (default: 15),
 *   personas?: CustomerPersona[]
 * }
 */
router.post('/', controller.startAutonomousTest);
/**
 * @route GET /api/autonomous-tests/:testId
 * @desc Get status and results of a specific test
 */
router.get('/:testId', controller.getTestStatus);
/**
 * @route GET /api/autonomous-tests/:testId/logs
 * @desc Get detailed conversation logs for a specific test
 */
router.get('/:testId/logs', controller.getConversationLogs);
/**
 * @route GET /api/autonomous-tests/:testId/report
 * @desc Get comprehensive analysis report for a specific test
 */
router.get('/:testId/report', controller.getDetailedReport);
/**
 * @route DELETE /api/autonomous-tests/:testId
 * @desc Stop a running test
 */
router.delete('/:testId', controller.stopTest);
/**
 * @route GET /api/autonomous-tests
 * @desc Get all tests (running and completed)
 */
router.get('/', controller.getAllTests);
