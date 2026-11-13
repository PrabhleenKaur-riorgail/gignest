import { Router } from 'express';
import { createOrder, simulateCheckout, verifyPayment, listTransactions } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/order', authorize('client'), createOrder);
router.post('/simulate', authorize('client'), simulateCheckout);
router.post('/verify', authorize('client'), verifyPayment);
router.get('/transactions', listTransactions);

export default router;
