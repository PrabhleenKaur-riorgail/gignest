import Bid from '../models/Bid.js';
import Project from '../models/Project.js';
import Contract from '../models/Contract.js';
import Milestone from '../models/Milestone.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { BID_STATUS, PROJECT_STATUS } from '../utils/constants.js';
import { str, parsePagination } from '../utils/validators.js';
import { createContractFromBid } from '../services/contractService.js';

const FREELANCER_FIELDS = 'name avatar bio skills hourlyRate ratingAverage ratingCount';

// Checks the bid form: amount, delivery time, cover letter and the optional milestone plan.
const cleanBidInput = (body) => {
  const { amount, deliveryDays, coverLetter, milestones } = body;

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 || amount > 10000000) {
    throw new AppError('Bid amount must be a number of at least 1', 400);
  }
  if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) {
    throw new AppError('Delivery time must be a whole number of days between 1 and 365', 400);
  }
  if (typeof coverLetter !== 'string' || coverLetter.trim().length < 20 || coverLetter.trim().length > 2000) {
    throw new AppError('Cover letter must be 20 to 2000 characters', 400);
  }

  let plan = [];
  if (milestones !== undefined && milestones !== null) {
    if (!Array.isArray(milestones) || milestones.length < 1 || milestones.length > 10) {
      throw new AppError('A milestone plan must have 1 to 10 milestones', 400);
    }
    let total = 0;
    let lastDay = 0;
    plan = milestones.map((m) => {
      if (!m || typeof m.title !== 'string' || m.title.trim().length < 3 || m.title.trim().length > 100) {
        throw new AppError('Each milestone title must be 3 to 100 characters', 400);
      }
      if (typeof m.amount !== 'number' || !Number.isFinite(m.amount) || m.amount < 1) {
        throw new AppError('Each milestone amount must be a number of at least 1', 400);
      }
      if (!Number.isInteger(m.dueDays) || m.dueDays < 1 || m.dueDays > deliveryDays) {
        throw new AppError('Each milestone due day must be between 1 and the delivery time', 400);
      }
      if (m.dueDays < lastDay) {
        throw new AppError('Milestones must be listed in order of due day', 400);
      }
      lastDay = m.dueDays;
      total += m.amount;
      return { title: m.title.trim(), amount: m.amount, dueDays: m.dueDays };
    });
    if (Math.abs(total - amount) > 0.01) {
      throw new AppError('Milestone amounts must add up to the bid amount', 400);
    }
  }

  return { amount, deliveryDays, coverLetter: coverLetter.trim(), milestones: plan };
};

// POST /api/projects/:projectId/bids  (freelancer)
export const submitBid = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (project.status !== PROJECT_STATUS.OPEN) {
    throw new AppError('This project is no longer accepting bids', 400);
  }

  const data = cleanBidInput(req.body);

  const existing = await Bid.findOne({ project: project._id, freelancer: req.user._id });
  if (existing) {
    if (existing.status !== BID_STATUS.WITHDRAWN) {
      throw new AppError('You have already placed a bid on this project', 409);
    }
    // A freelancer who withdrew may submit a fresh proposal.
    Object.assign(existing, data, { status: BID_STATUS.PENDING });
    await existing.save();
    await Project.updateOne({ _id: project._id }, { $inc: { bidCount: 1 } });
    return res.status(201).json({ bid: existing });
  }

  const bid = await Bid.create({ ...data, project: project._id, freelancer: req.user._id });
  await Project.updateOne({ _id: project._id }, { $inc: { bidCount: 1 } });
  res.status(201).json({ bid });
});

// GET /api/projects/:projectId/bids  (project owner or admin)
export const listProjectBids = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!project.client.equals(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('You can only view bids on your own projects', 403);
  }

  const bids = await Bid.find({ project: project._id, status: { $ne: BID_STATUS.WITHDRAWN } })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('freelancer', FREELANCER_FIELDS);

  // Sorting options that help the client compare proposals.
  const sorters = {
    price_low: (a, b) => a.amount - b.amount,
    price_high: (a, b) => b.amount - a.amount,
    fastest: (a, b) => a.deliveryDays - b.deliveryDays,
    rating: (a, b) => b.freelancer.ratingAverage - a.freelancer.ratingAverage,
  };
  const sorter = sorters[str(req.query.sort)];
  if (sorter) bids.sort(sorter);

  res.json({ bids, total: bids.length });
});

// GET /api/bids/mine  (freelancer)
export const listMyBids = asyncHandler(async (req, res) => {
  const filter = { freelancer: req.user._id };
  const status = str(req.query.status);
  if (status) {
    if (!Object.values(BID_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  }
  const { page, limit, skip } = parsePagination(req.query);

  const [bids, total] = await Promise.all([
    Bid.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('project', 'title category status budgetMin budgetMax deadline'),
    Bid.countDocuments(filter),
  ]);

  res.json({ bids, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/bids/:id/withdraw  (the freelancer who made it, only while PENDING)
export const withdrawBid = asyncHandler(async (req, res) => {
  const bid = await Bid.findOneAndUpdate(
    { _id: req.params.id, freelancer: req.user._id, status: BID_STATUS.PENDING },
    { status: BID_STATUS.WITHDRAWN },
    { new: true }
  );

  if (!bid) {
    const existing = await Bid.findById(req.params.id);
    if (!existing) throw new AppError('Bid not found', 404);
    if (!existing.freelancer.equals(req.user._id)) throw new AppError('You can only withdraw your own bids', 403);
    throw new AppError('Only pending bids can be withdrawn', 400);
  }

  await Project.updateOne({ _id: bid.project, bidCount: { $gt: 0 } }, { $inc: { bidCount: -1 } });
  res.json({ bid });
});

// Loads a bid together with its project and checks the logged-in client owns that project.
const getBidForOwner = async (req) => {
  const bid = await Bid.findById(req.params.id);
  if (!bid) throw new AppError('Bid not found', 404);
  const project = await Project.findById(bid.project);
  if (!project) throw new AppError('Project not found', 404);
  if (!project.client.equals(req.user._id)) {
    throw new AppError('You can only manage bids on your own projects', 403);
  }
  return { bid, project };
};

// PATCH /api/bids/:id/reject  (project owner, only while PENDING)
export const rejectBid = asyncHandler(async (req, res) => {
  const { bid } = await getBidForOwner(req);
  if (bid.status !== BID_STATUS.PENDING) throw new AppError('Only pending bids can be rejected', 400);

  const updated = await Bid.findOneAndUpdate(
    { _id: bid._id, status: BID_STATUS.PENDING },
    { status: BID_STATUS.REJECTED },
    { new: true }
  );
  if (!updated) throw new AppError('This bid is no longer pending', 400);
  res.json({ bid: updated });
});

// PATCH /api/bids/:id/accept  (project owner)
// Accepts this bid, rejects all others, moves the project to IN_PROGRESS and creates the contract.
export const acceptBid = asyncHandler(async (req, res) => {
  const { bid, project } = await getBidForOwner(req);
  if (bid.status !== BID_STATUS.PENDING) throw new AppError('Only pending bids can be accepted', 400);

  // Step 1: atomically claim the project. If two requests arrive together, only one wins.
  const claimed = await Project.findOneAndUpdate(
    { _id: project._id, client: req.user._id, status: PROJECT_STATUS.OPEN },
    { status: PROJECT_STATUS.IN_PROGRESS },
    { new: true }
  );
  if (!claimed) throw new AppError('This project is no longer open', 400);

  let created = null;
  try {
    // Step 2: atomically claim the bid.
    const accepted = await Bid.findOneAndUpdate(
      { _id: bid._id, status: BID_STATUS.PENDING },
      { status: BID_STATUS.ACCEPTED },
      { new: true }
    );
    if (!accepted) throw new AppError('This bid is no longer pending', 400);

    // Step 3: create the contract and its milestones.
    created = await createContractFromBid(claimed, accepted);

    // Step 4: reject every other pending bid on this project.
    await Bid.updateMany(
      { project: project._id, _id: { $ne: bid._id }, status: BID_STATUS.PENDING },
      { status: BID_STATUS.REJECTED }
    );

    res.json({ bid: accepted, project: claimed, contract: created.contract, milestones: created.milestones });
  } catch (err) {
    // Something failed: undo only what THIS request did.
    if (created) {
      await Milestone.deleteMany({ contract: created.contract._id });
      await Contract.deleteOne({ _id: created.contract._id });
    }
    await Bid.updateOne({ _id: bid._id, status: BID_STATUS.ACCEPTED }, { status: BID_STATUS.PENDING });

    // Reopen the project only if nobody else has been given a contract for it.
    const awardedToSomeoneElse = await Contract.exists({ project: project._id });
    if (!awardedToSomeoneElse) {
      await Project.updateOne({ _id: project._id }, { status: PROJECT_STATUS.OPEN });
    }

    if (err.code === 11000) {
      throw new AppError('This project has just been awarded to another freelancer', 409);
    }
    throw err;
  }
});
