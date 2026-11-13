import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listConversations,
  getByContract,
  getMessages,
  sendMessage,
  markRead,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Stops message flooding.
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  message: { message: 'You are sending messages too fast. Please slow down.' },
});

router.use(protect);
router.get('/', listConversations);
router.get('/by-contract/:contractId', getByContract); // before '/:id'
router.get('/:id/messages', getMessages);
router.post('/:id/messages', messageLimiter, sendMessage);
router.patch('/:id/read', markRead);

export default router;
