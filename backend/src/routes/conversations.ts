import { Router } from 'express';
import { ConversationController } from '../controllers/conversationController';

const router = Router();

/**
 * @route POST /api/conversations/message
 * @desc Send a message and get Forethought response (FIXED TO USE REAL FORETHOUGHT)
 */
router.post('/message', ConversationController.sendMessage);

/**
 * @route POST /api/conversations/freeform
 * @desc Start an autonomous freeform conversation with OpenAI customer simulation
 */
router.post('/freeform', ConversationController.startFreeformConversation);

/**
 * @route GET /api/conversations/:sessionId
 * @desc Get conversation details
 */
router.get('/:sessionId', ConversationController.getConversation);

/**
 * @route GET /api/conversations
 * @desc Get all conversations
 */
router.get('/', ConversationController.getConversations);

/**
 * @route GET /api/conversations/test/forethought
 * @desc Test Forethought connectivity and response quality
 */
router.get('/test/forethought', ConversationController.testForethought);

export default router;