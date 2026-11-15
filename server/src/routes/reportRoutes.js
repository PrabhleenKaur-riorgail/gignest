import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { message: 'You have sent too many reports. Please try again later.' },
});

router.post('/', protect, reportLimiter, createReport);

export default router;
