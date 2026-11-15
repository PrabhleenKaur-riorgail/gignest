import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Review from '../models/Review.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { REPORT_STATUS, REPORT_TARGET } from '../utils/constants.js';

// POST /api/reports  { targetType: USER|PROJECT|REVIEW, targetId, reason }   (any logged-in user)
export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason } = req.body;

  if (!Object.values(REPORT_TARGET).includes(targetType)) {
    throw new AppError('targetType must be USER, PROJECT or REVIEW', 400);
  }
  if (typeof targetId !== 'string' || !mongoose.isValidObjectId(targetId)) {
    throw new AppError('A valid targetId is required', 400);
  }
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 1000) {
    throw new AppError('Please explain the problem in 10 to 1000 characters', 400);
  }

  const models = { USER: User, PROJECT: Project, REVIEW: Review };
  const target = await models[targetType].findById(targetId);
  if (!target) throw new AppError('The item you are reporting was not found', 404);
  if (targetType === REPORT_TARGET.USER && target._id.equals(req.user._id)) {
    throw new AppError('You cannot report yourself', 400);
  }

  const duplicate = await Report.findOne({ reporter: req.user._id, targetType, targetId, status: REPORT_STATUS.OPEN });
  if (duplicate) throw new AppError('You have already reported this and it is still being reviewed', 409);

  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason: reason.trim() });
  res.status(201).json({ report });
});
