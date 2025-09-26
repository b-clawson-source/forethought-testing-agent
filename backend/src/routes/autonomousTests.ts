import { Router } from 'express';
import { AutonomousTestController } from '../controllers/autonomousTestController';

const router = Router();
const controller = new AutonomousTestController();

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

export { router as autonomousTestRoutes };