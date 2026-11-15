import { Router } from 'express';
import { createReview, getContractReviews } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/', createReview);
router.get('/contract/:contractId', getContractReviews);

export default router;
