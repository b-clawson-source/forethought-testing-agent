"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const conversationController_1 = require("../controllers/conversationController");
const router = express_1.default.Router();
// Start a new conversation
router.post('/', conversationController_1.ConversationController.startConversation);
// Get all conversations
router.get('/', conversationController_1.ConversationController.getAllConversations);
// Get conversation statistics
router.get('/stats', conversationController_1.ConversationController.getStats);
// Get specific conversation
router.get('/:sessionId', conversationController_1.ConversationController.getConversation);
// Get conversation messages
router.get('/:sessionId/messages', conversationController_1.ConversationController.getConversationMessages);
exports.default = router;
