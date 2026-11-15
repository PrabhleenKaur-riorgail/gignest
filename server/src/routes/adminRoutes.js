import { Router } from 'express';
import {
  getStats, listUsers, blockUser, unblockUser, listAllProjects, listReports, handleReport, deleteReview,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Everything here is for administrators only.
router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.get('/projects', listAllProjects);
router.get('/reports', listReports);
router.patch('/reports/:id', handleReport);
router.delete('/reviews/:id', deleteReview);

export default router;
