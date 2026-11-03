import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Checks the token sent in the "Authorization: Bearer <token>" header
// and attaches the logged-in user to req.user.
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Not logged in. Please log in to continue.', 401);
  }

  const token = header.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // throws if invalid or expired

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('This account no longer exists', 401);
  if (user.isBlocked) throw new AppError('Your account has been blocked', 403);

  req.user = user;
  next();
});

// Allows only certain roles, e.g. authorize('client') or authorize('admin').
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this', 403));
  }
  next();
};
