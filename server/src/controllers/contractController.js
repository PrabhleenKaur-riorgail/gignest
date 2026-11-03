import Contract from '../models/Contract.js';
import Milestone from '../models/Milestone.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CONTRACT_STATUS } from '../utils/constants.js';
import { str, parsePagination } from '../utils/validators.js';

const populateContract = (query) =>
  query
    .populate('project', 'title category status')
    .populate('client', 'name avatar company ratingAverage ratingCount')
    .populate('freelancer', 'name avatar skills ratingAverage ratingCount');

// GET /api/contracts  - my contracts (as client or freelancer). Admin sees all.
export const listMyContracts = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { $or: [{ client: req.user._id }, { freelancer: req.user._id }] };

  const status = str(req.query.status);
  if (status) {
    if (!Object.values(CONTRACT_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  }
  const { page, limit, skip } = parsePagination(req.query);

  const [contracts, total] = await Promise.all([
    populateContract(Contract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Contract.countDocuments(filter),
  ]);

  res.json({ contracts, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/contracts/:id  - one contract with its milestones (participants and admin only)
export const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new AppError('Contract not found', 404);

  const isParticipant = contract.client.equals(req.user._id) || contract.freelancer.equals(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('You do not have access to this contract', 403);
  }

  await contract.populate([
    { path: 'project', select: 'title category status' },
    { path: 'client', select: 'name avatar company ratingAverage ratingCount' },
    { path: 'freelancer', select: 'name avatar skills ratingAverage ratingCount' },
  ]);
  const milestones = await Milestone.find({ contract: contract._id }).sort({ order: 1 });

  res.json({ contract, milestones });
});
