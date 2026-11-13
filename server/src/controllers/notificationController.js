import Notification from '../models/Notification.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { str, parsePagination } from '../utils/validators.js';

// GET /api/notifications?unread=true&page=1&limit=20
export const listNotifications = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (str(req.query.unread) === 'true') filter.isRead = false;
  const { page, limit, skip } = parsePagination(req.query, 20);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({ notifications, unreadCount, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ updated: result.modifiedCount });
});

// PATCH /api/notifications/:id/read
export const markOneRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ notification });
});
