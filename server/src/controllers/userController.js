import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isHttpUrl, normalizeSkills } from '../utils/validators.js';

// GET /api/users/:id  - public profile (no email, hides blocked users and admins)
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    isBlocked: false,
    role: { $ne: 'admin' },
  }).select('-email -isBlocked');

  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
});

// PUT /api/users/me  - update my own profile
export const updateMyProfile = asyncHandler(async (req, res) => {
  const body = req.body;
  const user = req.user;
  const isFreelancer = user.role === 'freelancer';
  const isClient = user.role === 'client';

  const has = (key) => body[key] !== undefined;

  if (has('name')) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 60) {
      throw new AppError('Name must be 2 to 60 characters', 400);
    }
    user.name = body.name.trim();
  }

  if (has('bio')) {
    if (typeof body.bio !== 'string' || body.bio.length > 1000) {
      throw new AppError('Bio must be text of at most 1000 characters', 400);
    }
    user.bio = body.bio.trim();
  }

  if (has('avatar')) {
    if (typeof body.avatar !== 'string' || (body.avatar !== '' && !isHttpUrl(body.avatar))) {
      throw new AppError('Avatar must be a valid image link', 400);
    }
    user.avatar = body.avatar;
  }

  // Freelancer-only fields
  if (has('skills')) {
    if (!isFreelancer) throw new AppError('Only freelancers can set skills', 400);
    user.skills = normalizeSkills(body.skills, { max: 20 });
  }
  if (has('hourlyRate')) {
    if (!isFreelancer) throw new AppError('Only freelancers can set an hourly rate', 400);
    if (typeof body.hourlyRate !== 'number' || !Number.isFinite(body.hourlyRate) || body.hourlyRate < 0 || body.hourlyRate > 100000) {
      throw new AppError('Hourly rate must be a number between 0 and 100000', 400);
    }
    user.hourlyRate = body.hourlyRate;
  }
  if (has('portfolioLinks')) {
    if (!isFreelancer) throw new AppError('Only freelancers can set portfolio links', 400);
    const links = body.portfolioLinks;
    if (!Array.isArray(links) || links.length > 10 || !links.every((l) => typeof l === 'string' && isHttpUrl(l))) {
      throw new AppError('Portfolio links must be a list of up to 10 valid web links', 400);
    }
    user.portfolioLinks = links;
  }

  // Client-only field
  if (has('company')) {
    if (!isClient) throw new AppError('Only clients can set a company name', 400);
    if (typeof body.company !== 'string' || body.company.length > 100) {
      throw new AppError('Company name must be text of at most 100 characters', 400);
    }
    user.company = body.company.trim();
  }

  await user.save();
  res.json({ user });
});
