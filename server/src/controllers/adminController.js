import User from '../models/User.js';
import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import Contract from '../models/Contract.js';
import Transaction from '../models/Transaction.js';
import Review from '../models/Review.js';
import Report from '../models/Report.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  CATEGORIES, CONTRACT_STATUS, NOTIFICATION_TYPE, PAYMENT_STATUS, PROJECT_STATUS,
  REPORT_STATUS, REPORT_TARGET, TRANSACTION_TYPE,
} from '../utils/constants.js';
import { str, escapeRegex, parsePagination } from '../utils/validators.js';
import { countBy, lastMonths, round2 } from '../utils/stats.js';
import { forceDisconnect } from '../socket.js';
import { notify } from '../services/notificationService.js';
import { recalculateRating } from './reviewController.js';

const pageInfo = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

// GET /api/admin/stats  - everything the admin dashboard needs, ready for charts.
// (Rows are summed in JavaScript to keep the code simple; for a very large platform
//  these would become MongoDB aggregation pipelines.)
export const getStats = asyncHandler(async (req, res) => {
  const [users, projects, contracts, bidCount, paid, openReports] = await Promise.all([
    User.find().select('role isBlocked createdAt'),
    Project.find().select('status category'),
    Contract.find().select('status'),
    Bid.countDocuments(),
    Transaction.find({ status: PAYMENT_STATUS.PAID }).select('type amount commission netAmount createdAt'),
    Report.countDocuments({ status: REPORT_STATUS.OPEN }),
  ]);

  const roles = countBy(users, 'role');
  const funded = paid.filter((t) => t.type === TRANSACTION_TYPE.FUND);
  const released = paid.filter((t) => t.type === TRANSACTION_TYPE.RELEASE);
  const total = (rows, field) => round2(rows.reduce((s, r) => s + r[field], 0));
  const zeroFill = (counts, keys) => Object.fromEntries(keys.map((k) => [k, counts[k] || 0]));

  const months = lastMonths();
  const userGrowth = months.map((month) => {
    const inMonth = users.filter((u) => u.createdAt.toISOString().slice(0, 7) === month);
    return {
      month,
      clients: inMonth.filter((u) => u.role === 'client').length,
      freelancers: inMonth.filter((u) => u.role === 'freelancer').length,
    };
  });
  const volumeByMonth = months.map((month) => {
    const inMonth = (rows) => rows.filter((t) => t.createdAt.toISOString().slice(0, 7) === month);
    return { month, funded: total(inMonth(funded), 'amount'), commission: total(inMonth(released), 'commission') };
  });

  res.json({
    users: {
      total: users.length,
      clients: roles.client || 0,
      freelancers: roles.freelancer || 0,
      admins: roles.admin || 0,
      blocked: users.filter((u) => u.isBlocked).length,
    },
    projects: { total: projects.length, byStatus: zeroFill(countBy(projects, 'status'), Object.values(PROJECT_STATUS)) },
    contracts: { total: contracts.length, byStatus: zeroFill(countBy(contracts, 'status'), Object.values(CONTRACT_STATUS)) },
    bids: { total: bidCount },
    money: {
      totalFunded: total(funded, 'amount'),
      totalPaidOut: total(released, 'netAmount'),
      commissionEarned: total(released, 'commission'),
    },
    openReports,
    userGrowth,
    volumeByMonth,
    projectsByCategory: Object.entries(countBy(projects, 'category')).map(([category, count]) => ({ category, count })),
  });
});

// GET /api/admin/users?q=&role=&blocked=true|false&page=
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const q = str(req.query.q)?.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const role = str(req.query.role);
  if (role) {
    if (!['client', 'freelancer', 'admin'].includes(role)) throw new AppError('Unknown role', 400);
    filter.role = role;
  }
  const blocked = str(req.query.blocked);
  if (blocked === 'true') filter.isBlocked = true;
  if (blocked === 'false') filter.isBlocked = false;

  const { page, limit, skip } = parsePagination(req.query, 20);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, ...pageInfo(page, limit, total) });
});

const setBlocked = (blocked) =>
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'admin') throw new AppError('Admin accounts cannot be blocked', 400);

    user.isBlocked = blocked;
    await user.save();
    if (blocked) forceDisconnect(user._id); // kick them out of live chats immediately
    res.json({ user });
  });

// PATCH /api/admin/users/:id/block  and  /unblock
export const blockUser = setBlocked(true);
export const unblockUser = setBlocked(false);

// GET /api/admin/projects?q=&status=&category=&page=   (every project, any status)
export const listAllProjects = asyncHandler(async (req, res) => {
  const filter = {};
  const q = str(req.query.q)?.trim();
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');
  const status = str(req.query.status);
  if (status) {
    if (!Object.values(PROJECT_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  }
  const category = str(req.query.category);
  if (category) {
    if (!CATEGORIES.includes(category)) throw new AppError('Unknown category', 400);
    filter.category = category;
  }

  const { page, limit, skip } = parsePagination(req.query, 20);
  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('client', 'name email'),
    Project.countDocuments(filter),
  ]);
  res.json({ projects, ...pageInfo(page, limit, total) });
});

// A short description of what a report is about, so the admin sees it without extra clicks.
const describeTarget = async (report) => {
  if (report.targetType === REPORT_TARGET.USER) {
    const u = await User.findById(report.targetId).select('name email');
    return u ? { exists: true, label: `${u.name} (${u.email})` } : { exists: false, label: '(user no longer exists)' };
  }
  if (report.targetType === REPORT_TARGET.PROJECT) {
    const p = await Project.findById(report.targetId).select('title');
    return p ? { exists: true, label: p.title } : { exists: false, label: '(project no longer exists)' };
  }
  const r = await Review.findById(report.targetId).select('rating comment');
  return r ? { exists: true, label: `${r.rating}/5 - ${r.comment.slice(0, 80)}` } : { exists: false, label: '(review no longer exists)' };
};

// GET /api/admin/reports?status=OPEN&page=
export const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  const status = str(req.query.status);
  if (status) {
    if (!Object.values(REPORT_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  }
  const { page, limit, skip } = parsePagination(req.query, 20);

  const [rows, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporter', 'name email'),
    Report.countDocuments(filter),
  ]);
  const reports = await Promise.all(rows.map(async (r) => ({ ...r.toJSON(), target: await describeTarget(r) })));
  res.json({ reports, ...pageInfo(page, limit, total) });
});

// PATCH /api/admin/reports/:id  { status: RESOLVED|DISMISSED, adminNote }
export const handleReport = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (![REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED].includes(status)) {
    throw new AppError('Status must be RESOLVED or DISMISSED', 400);
  }
  if (adminNote !== undefined && (typeof adminNote !== 'string' || adminNote.length > 1000)) {
    throw new AppError('Admin note must be text of at most 1000 characters', 400);
  }

  const report = await Report.findOneAndUpdate(
    { _id: req.params.id, status: REPORT_STATUS.OPEN },
    { status, adminNote: (adminNote || '').trim(), resolvedBy: req.user._id, resolvedAt: new Date() },
    { new: true }
  );
  if (!report) {
    if (!(await Report.exists({ _id: req.params.id }))) throw new AppError('Report not found', 404);
    throw new AppError('This report has already been handled', 400);
  }

  await notify(report.reporter, {
    type: NOTIFICATION_TYPE.REPORT_UPDATE,
    message: status === REPORT_STATUS.RESOLVED
      ? 'Thank you. Your report was reviewed and action was taken.'
      : 'Your report was reviewed. No action was needed.',
    link: '',
  });
  res.json({ report });
});

// DELETE /api/admin/reviews/:id  - remove an abusive review and fix the person's rating
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  await recalculateRating(review.reviewee);
  res.json({ message: 'Review deleted' });
});
