import express from 'express';
import { ConversationController } from '../controllers/conversationController';

const router = express.Router();

// Start a new conversation
router.post('/', ConversationController.startConversation);

// Get all conversations
router.get('/', ConversationController.getAllConversations);

// Get conversation statistics
router.get('/stats', ConversationController.getStats);

// Get specific conversation
router.get('/:sessionId', ConversationController.getConversation);

// Get conversation messages
router.get('/:sessionId/messages', ConversationController.getConversationMessages);

export default router;
