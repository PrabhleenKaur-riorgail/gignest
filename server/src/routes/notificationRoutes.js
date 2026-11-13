import { Router } from 'express';
import { listNotifications, markAllRead, markOneRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', listNotifications);
router.patch('/read-all', markAllRead); // before '/:id/read'
router.patch('/:id/read', markOneRead);

export default router;
