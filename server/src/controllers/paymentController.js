import Transaction from '../models/Transaction.js';
import Milestone from '../models/Milestone.js';
import Contract from '../models/Contract.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CONTRACT_STATUS, MILESTONE_STATUS, PAYMENT_STATUS, TRANSACTION_TYPE, NOTIFICATION_TYPE } from '../utils/constants.js';
import { notify } from '../services/notificationService.js';
import { str, parsePagination } from '../utils/validators.js';
import { generateId, signPayment, verifySignature, TEST_CARDS } from '../services/paymentService.js';

// POST /api/payments/order  { milestoneId }   (client of the contract)
// Step 1 of paying: creates an order for the milestone amount.
export const createOrder = asyncHandler(async (req, res) => {
  const { milestoneId } = req.body;
  if (typeof milestoneId !== 'string') throw new AppError('milestoneId is required', 400);

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new AppError('Milestone not found', 404);
  const contract = await Contract.findById(milestone.contract);

  if (!contract.client.equals(req.user._id)) throw new AppError('Only the client of this contract can fund it', 403);
  if (contract.status !== CONTRACT_STATUS.ACTIVE) throw new AppError('This contract is not active', 400);
  if (milestone.status !== MILESTONE_STATUS.PENDING) throw new AppError('This milestone has already been funded', 400);

  // Milestones are funded one after another.
  const earlierUnfinished = await Milestone.countDocuments({
    contract: contract._id,
    order: { $lt: milestone.order },
    status: { $ne: MILESTONE_STATUS.RELEASED },
  });
  if (earlierUnfinished > 0) throw new AppError('Complete and release the earlier milestones first', 400);

  // Any older unpaid order for this milestone is now void.
  await Transaction.updateMany(
    { milestone: milestone._id, type: TRANSACTION_TYPE.FUND, status: PAYMENT_STATUS.CREATED },
    { status: PAYMENT_STATUS.FAILED }
  );

  const tx = await Transaction.create({
    contract: contract._id,
    milestone: milestone._id,
    payer: req.user._id,
    payee: contract.freelancer,
    type: TRANSACTION_TYPE.FUND,
    amount: milestone.amount,
    netAmount: milestone.amount,
    orderId: generateId('order'),
  });

  res.status(201).json({
    order: { orderId: tx.orderId, amount: tx.amount, currency: 'INR', milestoneId: milestone._id, mode: 'simulated' },
  });
});

// POST /api/payments/simulate  { orderId, cardNumber }   (client)
// Plays the role of the payment gateway's checkout page.
// Test card 4111 1111 1111 1111 succeeds, 4000 0000 0000 0002 is declined.
export const simulateCheckout = asyncHandler(async (req, res) => {
  if (process.env.PAYMENT_MODE === 'live') throw new AppError('Route not found', 404);

  const { orderId, cardNumber } = req.body;
  if (typeof orderId !== 'string' || typeof cardNumber !== 'string') {
    throw new AppError('orderId and cardNumber are required', 400);
  }

  const tx = await Transaction.findOne({ orderId, type: TRANSACTION_TYPE.FUND });
  if (!tx) throw new AppError('Order not found', 404);
  if (!tx.payer.equals(req.user._id)) throw new AppError('This is not your order', 403);
  if (tx.status !== PAYMENT_STATUS.CREATED) throw new AppError('This order can no longer be paid', 400);

  const outcome = TEST_CARDS[cardNumber.replace(/[\s-]/g, '')];
  if (!outcome) throw new AppError('Invalid card. Use the test card 4111 1111 1111 1111', 400);

  if (outcome === 'declined') {
    await Transaction.updateOne({ _id: tx._id }, { status: PAYMENT_STATUS.FAILED });
    throw new AppError('Payment declined by the bank (test card)', 402);
  }

  const paymentId = generateId('pay');
  res.json({ orderId, paymentId, signature: signPayment(orderId, paymentId) });
});

// POST /api/payments/verify  { orderId, paymentId, signature }   (client)
// Step 2 of paying: the server checks the signature. Only then is the milestone funded.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    throw new AppError('orderId, paymentId and signature are required', 400);
  }

  const tx = await Transaction.findOne({ orderId, type: TRANSACTION_TYPE.FUND });
  if (!tx) throw new AppError('Order not found', 404);
  if (!tx.payer.equals(req.user._id)) throw new AppError('This is not your order', 403);
  if (tx.status !== PAYMENT_STATUS.CREATED) throw new AppError('This payment was already processed', 400);

  if (!verifySignature(orderId, paymentId, signature)) {
    await Transaction.updateOne({ _id: tx._id, status: PAYMENT_STATUS.CREATED }, { status: PAYMENT_STATUS.FAILED });
    throw new AppError('Payment verification failed', 400);
  }

  // Mark the order paid. The uniqueKey makes it impossible to fund one milestone twice.
  let paid;
  try {
    paid = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: PAYMENT_STATUS.CREATED },
      { status: PAYMENT_STATUS.PAID, paymentId, uniqueKey: `fund:${tx.milestone}` },
      { new: true }
    );
  } catch (err) {
    if (err.code === 11000) throw new AppError('This milestone has already been funded', 400);
    throw err;
  }
  if (!paid) throw new AppError('This payment was already processed', 400);

  const milestone = await Milestone.findOneAndUpdate(
    { _id: tx.milestone, status: MILESTONE_STATUS.PENDING },
    { status: MILESTONE_STATUS.FUNDED },
    { new: true }
  );
  if (!milestone) {
    await Transaction.updateOne({ _id: tx._id }, { status: PAYMENT_STATUS.FAILED, $unset: { uniqueKey: 1 } });
    throw new AppError('This milestone is no longer waiting for payment', 400);
  }

  await notify(tx.payee, {
    type: NOTIFICATION_TYPE.MILESTONE_FUNDED,
    message: `"${milestone.title}" was funded (₹${milestone.amount}). You can start working.`,
    link: `/contracts/${tx.contract}`,
  });

  res.json({ message: 'Payment verified. Milestone funded.', milestone, transaction: paid });
});

// GET /api/payments/transactions  - my payment history (admin sees all)
export const listTransactions = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { $or: [{ payer: req.user._id }, { payee: req.user._id }] };

  const type = str(req.query.type);
  if (type) {
    if (!Object.values(TRANSACTION_TYPE).includes(type)) throw new AppError('Unknown type', 400);
    filter.type = type;
  }
  const status = str(req.query.status);
  if (status) {
    if (!Object.values(PAYMENT_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  } else {
    filter.status = { $ne: PAYMENT_STATUS.CREATED }; // hide unpaid orders by default
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('milestone', 'title order')
      .populate('payer', 'name')
      .populate('payee', 'name'),
    Transaction.countDocuments(filter),
  ]);

  res.json({ transactions, page, limit, total, totalPages: Math.ceil(total / limit) });
});
