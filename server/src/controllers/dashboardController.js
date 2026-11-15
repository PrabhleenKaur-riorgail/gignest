import Project from '../models/Project.js';
import Contract from '../models/Contract.js';
import Bid from '../models/Bid.js';
import Transaction from '../models/Transaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import { BID_STATUS, CONTRACT_STATUS, PROJECT_STATUS, TRANSACTION_TYPE, PAYMENT_STATUS } from '../utils/constants.js';
import { countBy, round2, sumByMonth } from '../utils/stats.js';

const withZeros = (counts, keys) => Object.fromEntries(keys.map((k) => [k, counts[k] || 0]));
const sum = (rows, field) => round2(rows.reduce((total, r) => total + r[field], 0));

// GET /api/dashboard/client
export const clientDashboard = asyncHandler(async (req, res) => {
  const me = req.user._id;

  const [projects, contracts, funded] = await Promise.all([
    Project.find({ client: me }).select('status category'),
    Contract.find({ client: me }).select('status'),
    Transaction.find({ payer: me, type: TRANSACTION_TYPE.FUND, status: PAYMENT_STATUS.PAID }).select('amount createdAt'),
  ]);
  const pendingBids = projects.length
    ? await Bid.countDocuments({ project: { $in: projects.map((p) => p._id) }, status: BID_STATUS.PENDING })
    : 0;

  const contractCounts = countBy(contracts, 'status');
  const categoryCounts = countBy(projects, 'category');

  res.json({
    stats: {
      totalProjects: projects.length,
      projectsByStatus: withZeros(countBy(projects, 'status'), Object.values(PROJECT_STATUS)),
      activeContracts: contractCounts[CONTRACT_STATUS.ACTIVE] || 0,
      completedContracts: contractCounts[CONTRACT_STATUS.COMPLETED] || 0,
      pendingBidsToReview: pendingBids,
      totalSpent: sum(funded, 'amount'),
      ratingAverage: req.user.ratingAverage,
      ratingCount: req.user.ratingCount,
    },
    spendingByMonth: sumByMonth(funded, 'amount'),
    projectsByCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
  });
});

// GET /api/dashboard/freelancer
export const freelancerDashboard = asyncHandler(async (req, res) => {
  const me = req.user._id;

  const [bids, contracts, released] = await Promise.all([
    Bid.find({ freelancer: me }).select('status'),
    Contract.find({ freelancer: me }).select('status'),
    Transaction.find({ payee: me, type: TRANSACTION_TYPE.RELEASE, status: PAYMENT_STATUS.PAID }).select('netAmount commission createdAt'),
  ]);

  const bidCounts = withZeros(countBy(bids, 'status'), Object.values(BID_STATUS));
  const decided = bidCounts.ACCEPTED + bidCounts.REJECTED;
  const contractCounts = countBy(contracts, 'status');

  res.json({
    stats: {
      walletBalance: req.user.walletBalance,
      totalEarned: sum(released, 'netAmount'),
      feesPaid: sum(released, 'commission'),
      activeContracts: contractCounts[CONTRACT_STATUS.ACTIVE] || 0,
      completedContracts: contractCounts[CONTRACT_STATUS.COMPLETED] || 0,
      totalBids: bids.length,
      bidsByStatus: bidCounts,
      pendingBids: bidCounts.PENDING,
      // Share of decided bids that were accepted (null until at least one bid is decided).
      bidSuccessRate: decided ? Math.round((bidCounts.ACCEPTED / decided) * 1000) / 10 : null,
      ratingAverage: req.user.ratingAverage,
      ratingCount: req.user.ratingCount,
    },
    earningsByMonth: sumByMonth(released, 'netAmount'),
  });
});
