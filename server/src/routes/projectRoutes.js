import { Router } from 'express';
import {
  getCategories,
  createProject,
  listProjects,
  listMyProjects,
  getProject,
  updateProject,
  closeProject,
  deleteProject,
} from '../controllers/projectController.js';
import { submitBid, listProjectBids } from '../controllers/bidController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Fixed paths must come before '/:id' so they are not mistaken for an id.
router.get('/categories', getCategories);
router.get('/mine', protect, authorize('client'), listMyProjects);

router.get('/', listProjects);
router.post('/', protect, authorize('client'), createProject);

router.post('/:projectId/bids', protect, authorize('freelancer'), submitBid);
router.get('/:projectId/bids', protect, authorize('client', 'admin'), listProjectBids);

router.get('/:id', getProject);
router.put('/:id', protect, authorize('client'), updateProject);
router.patch('/:id/close', protect, authorize('client'), closeProject);
router.delete('/:id', protect, authorize('client', 'admin'), deleteProject);

export default router;
