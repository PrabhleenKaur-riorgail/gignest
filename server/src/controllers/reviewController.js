import Review from '../models/Review.js';
import Contract from '../models/Contract.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CONTRACT_STATUS, NOTIFICATION_TYPE } from '../utils/constants.js';
import { parsePagination } from '../utils/validators.js';
import { round2 } from '../utils/stats.js';
import { notify } from '../services/notificationService.js';

// Recalculates a person's average rating from all the reviews they received.
export const recalculateRating = async (userId) => {
  const rows = await Review.find({ reviewee: userId }).select('rating');
  const count = rows.length;
  const average = count ? round2(rows.reduce((sum, r) => sum + r.rating, 0) / count) : 0;
  await User.updateOne({ _id: userId }, { ratingAverage: average, ratingCount: count });
  return { average, count };
};

// POST /api/reviews  { contractId, rating, comment }
export const createReview = asyncHandler(async (req, res) => {
  const { contractId, rating, comment } = req.body;

  if (typeof contractId !== 'string') throw new AppError('contractId is required', 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('Rating must be a whole number from 1 to 5', 400);
  }
  if (comment !== undefined && (typeof comment !== 'string' || comment.length > 1000)) {
    throw new AppError('Comment must be text of at most 1000 characters', 400);
  }

  const contract = await Contract.findById(contractId);
  if (!contract) throw new AppError('Contract not found', 404);

  const isClient = contract.client.equals(req.user._id);
  const isFreelancer = contract.freelancer.equals(req.user._id);
  if (!isClient && !isFreelancer) throw new AppError('Only the people on this contract can review it', 403);
  if (contract.status !== CONTRACT_STATUS.COMPLETED) {
    throw new AppError('You can leave a review only after the contract is completed', 400);
  }

  const project = await Project.findById(contract.project).select('title');
  let review;
  try {
    review = await Review.create({
      contract: contract._id,
      reviewer: req.user._id,
      reviewee: isClient ? contract.freelancer : contract.client,
      reviewerRole: isClient ? 'client' : 'freelancer',
      rating,
      comment: (comment || '').trim(),
      projectTitle: project?.title || '',
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError('You have already reviewed this contract', 409);
    throw err;
  }

  await recalculateRating(review.reviewee);
  await notify(review.reviewee, {
    type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
    message: `${req.user.name} rated you ${rating}/5${project ? ` for "${project.title}"` : ''}.`,
    link: `/profile/${review.reviewee}`,
  });

  res.status(201).json({ review });
});

// GET /api/reviews/contract/:contractId  - reviews on one contract, and whether I can still review it
export const getContractReviews = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new AppError('Contract not found', 404);

  const isParticipant = contract.client.equals(req.user._id) || contract.freelancer.equals(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') throw new AppError('You do not have access to this contract', 403);

  const reviews = await Review.find({ contract: contract._id }).populate('reviewer', 'name avatar role');
  const alreadyReviewed = reviews.some((r) => r.reviewer._id.equals(req.user._id));
  const canReview = isParticipant && contract.status === CONTRACT_STATUS.COMPLETED && !alreadyReviewed;

  res.json({ reviews, canReview });
});

// GET /api/users/:id/reviews  - public: reviews a person has received
export const getUserReviews = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isBlocked: false, role: { $ne: 'admin' } }).select('name ratingAverage ratingCount');
  if (!user) throw new AppError('User not found', 404);

  const { page, limit, skip } = parsePagination(req.query);
  const [reviews, total] = await Promise.all([
    Review.find({ reviewee: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reviewer', 'name avatar role'),
    Review.countDocuments({ reviewee: user._id }),
  ]);

  res.json({
    reviews,
    summary: { ratingAverage: user.ratingAverage, ratingCount: user.ratingCount },
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});
