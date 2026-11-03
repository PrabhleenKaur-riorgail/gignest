import { Router } from 'express';
import { listMyBids, withdrawBid, acceptBid, rejectBid } from '../controllers/bidController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/mine', protect, authorize('freelancer'), listMyBids);
router.patch('/:id/withdraw', protect, authorize('freelancer'), withdrawBid);
router.patch('/:id/accept', protect, authorize('client'), acceptBid);
router.patch('/:id/reject', protect, authorize('client'), rejectBid);

export default router;
