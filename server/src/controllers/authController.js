import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Values must be plain strings (this also blocks NoSQL-injection objects like {"$gt": ""})
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new AppError('Name must be at least 2 characters', 400);
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError('Please enter a valid email address', 400);
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  if (!['client', 'freelancer'].includes(role)) {
    throw new AppError('Role must be either client or freelancer', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create({ name: name.trim(), email: cleanEmail, password, role });

  res.status(201).json({ token: generateToken(user._id), user });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

  // Same message for "no such user" and "wrong password" so attackers learn nothing.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.isBlocked) {
    throw new AppError('Your account has been blocked. Please contact support.', 403);
  }

  res.json({ token: generateToken(user._id), user });
});

// GET /api/auth/me  (needs a valid token)
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
