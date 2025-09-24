import { Router } from 'express';
import { TestController } from '../controllers/testController';

const router = Router();
const testController = new TestController();

// Start a new test cycle (autonomous, widget-backed)
router.post('/start', (req, res) => testController.startTestCycle(req, res));

// Get test status
router.get('/status/:testId', (req, res) => testController.getTestStatus(req, res));

// All test reports
router.get('/reports', (req, res) => testController.getTestReports(req, res));

// Specific test report
router.get('/reports/:reportId', (req, res) => testController.getTestReport(req, res));

// Active tests
router.get('/active', (req, res) => testController.getActiveTests(req, res));

/**
 * Convenience endpoint to run a single full conversation quickly (no scheduler).
 * Body: { personaType: "Missing Points", maxTurnsPerConversation: 8, delayBetweenTurns?: 1200 }
 */
router.post('/run-once', async (req, res) => {
  try {
    const cfg = {
      numberOfConversations: 1,
      personaType: req.body?.personaType ?? 'Missing Points',
      maxTurnsPerConversation: req.body?.maxTurnsPerConversation ?? 8,
      delayBetweenTurns: req.body?.delayBetweenTurns ?? 1500,
      delayBetweenConversations: 0
    };
    const result = await testController.runAdHocSingle(cfg);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;