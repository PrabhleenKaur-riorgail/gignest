import { Router } from 'express';
import { getPublicProfile, updateMyProfile } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.put('/me', protect, updateMyProfile);
router.get('/:id', getPublicProfile);

export default router;
