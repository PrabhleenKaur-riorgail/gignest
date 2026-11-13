import { Router } from 'express';
import { getMilestone, submitWork, requestRevision, approveWork } from '../controllers/milestoneController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/:id', getMilestone);
router.patch('/:id/submit', authorize('freelancer'), submitWork);
router.patch('/:id/request-revision', authorize('client'), requestRevision);
router.patch('/:id/approve', authorize('client'), approveWork);

export default router;
