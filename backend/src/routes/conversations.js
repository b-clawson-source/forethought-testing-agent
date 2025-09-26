"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var conversationController_1 = require("../controllers/conversationController");
var router = (0, express_1.Router)();
/**
 * @route POST /api/conversations/message
 * @desc Send a message and get Forethought response (FIXED TO USE REAL FORETHOUGHT)
 */
router.post('/message', conversationController_1.ConversationController.sendMessage);
/**
 * @route POST /api/conversations/freeform
 * @desc Start an autonomous freeform conversation with OpenAI customer simulation
 */
router.post('/freeform', conversationController_1.ConversationController.startFreeformConversation);
/**
 * @route GET /api/conversations/:sessionId
 * @desc Get conversation details
 */
router.get('/:sessionId', conversationController_1.ConversationController.getConversation);
/**
 * @route GET /api/conversations
 * @desc Get all conversations
 */
router.get('/', conversationController_1.ConversationController.getConversations);
/**
 * @route GET /api/conversations/test/forethought
 * @desc Test Forethought connectivity and response quality
 */
router.get('/test/forethought', conversationController_1.ConversationController.testForethought);
exports.default = router;
