import { Router } from 'express';
import { listMyContracts, getContract } from '../controllers/contractController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', listMyContracts);
router.get('/:id', getContract);

export default router;
