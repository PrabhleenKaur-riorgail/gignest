import Milestone from '../models/Milestone.js';
import Contract from '../models/Contract.js';
import Project from '../models/Project.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CONTRACT_STATUS, MILESTONE_STATUS, PAYMENT_STATUS, PROJECT_STATUS, TRANSACTION_TYPE, NOTIFICATION_TYPE } from '../utils/constants.js';
import { notify } from '../services/notificationService.js';
import { isHttpUrl } from '../utils/validators.js';

// Loads a milestone and its contract, and checks the contract is still active.
const load = async (id, { needActive = true } = {}) => {
  const milestone = await Milestone.findById(id);
  if (!milestone) throw new AppError('Milestone not found', 404);
  const contract = await Contract.findById(milestone.contract);
  if (needActive && contract.status !== CONTRACT_STATUS.ACTIVE) {
    throw new AppError('This contract is not active', 400);
  }
  return { milestone, contract };
};

// GET /api/milestones/:id  (the two people on the contract, or admin)
export const getMilestone = asyncHandler(async (req, res) => {
  const { milestone, contract } = await load(req.params.id, { needActive: false });
  const isParticipant = contract.client.equals(req.user._id) || contract.freelancer.equals(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') throw new AppError('You do not have access to this milestone', 403);
  res.json({ milestone });
});

// PATCH /api/milestones/:id/submit  { note, links }   (freelancer of the contract)
export const submitWork = asyncHandler(async (req, res) => {
  const { milestone, contract } = await load(req.params.id);
  if (!contract.freelancer.equals(req.user._id)) throw new AppError('Only the freelancer on this contract can submit work', 403);

  if (milestone.status === MILESTONE_STATUS.PENDING) {
    throw new AppError('The client has not funded this milestone yet', 400);
  }
  if (![MILESTONE_STATUS.FUNDED, MILESTONE_STATUS.REVISION_REQUESTED].includes(milestone.status)) {
    throw new AppError('Work cannot be submitted for this milestone right now', 400);
  }

  const { note, links } = req.body;
  if (typeof note !== 'string' || note.trim().length < 10 || note.trim().length > 2000) {
    throw new AppError('Please describe your work in 10 to 2000 characters', 400);
  }
  let files = [];
  if (links !== undefined) {
    if (!Array.isArray(links) || links.length > 5 || !links.every((l) => typeof l === 'string' && l.length <= 500 && isHttpUrl(l))) {
      throw new AppError('Links must be a list of up to 5 valid web links', 400);
    }
    files = links.map((url) => ({ url, name: new URL(url).hostname }));
  }

  const updated = await Milestone.findOneAndUpdate(
    { _id: milestone._id, status: { $in: [MILESTONE_STATUS.FUNDED, MILESTONE_STATUS.REVISION_REQUESTED] } },
    { status: MILESTONE_STATUS.SUBMITTED, submissionNote: note.trim(), submissionFiles: files, submittedAt: new Date() },
    { new: true }
  );
  if (!updated) throw new AppError('Work cannot be submitted for this milestone right now', 400);
  await notify(contract.client, {
    type: NOTIFICATION_TYPE.WORK_SUBMITTED,
    message: `${req.user.name} submitted work for "${updated.title}". Please review it.`,
    link: `/contracts/${contract._id}`,
  });
  res.json({ milestone: updated });
});

// PATCH /api/milestones/:id/request-revision  { notes }   (client of the contract)
export const requestRevision = asyncHandler(async (req, res) => {
  const { milestone, contract } = await load(req.params.id);
  if (!contract.client.equals(req.user._id)) throw new AppError('Only the client of this contract can request a revision', 403);
  if (milestone.status !== MILESTONE_STATUS.SUBMITTED) throw new AppError('There is no submitted work to review', 400);

  const { notes } = req.body;
  if (typeof notes !== 'string' || notes.trim().length < 10 || notes.trim().length > 2000) {
    throw new AppError('Please explain what to change in 10 to 2000 characters', 400);
  }

  const updated = await Milestone.findOneAndUpdate(
    { _id: milestone._id, status: MILESTONE_STATUS.SUBMITTED },
    { status: MILESTONE_STATUS.REVISION_REQUESTED, revisionNotes: notes.trim() },
    { new: true }
  );
  if (!updated) throw new AppError('There is no submitted work to review', 400);
  await notify(contract.freelancer, {
    type: NOTIFICATION_TYPE.REVISION_REQUESTED,
    message: `${req.user.name} asked for changes on "${updated.title}".`,
    link: `/contracts/${contract._id}`,
  });
  res.json({ milestone: updated });
});

// PATCH /api/milestones/:id/approve   (client of the contract)
// Approves the work and releases the money to the freelancer (minus the platform fee).
export const approveWork = asyncHandler(async (req, res) => {
  const { milestone, contract } = await load(req.params.id);
  if (!contract.client.equals(req.user._id)) throw new AppError('Only the client of this contract can approve work', 403);
  if (milestone.status !== MILESTONE_STATUS.SUBMITTED) throw new AppError('There is no submitted work to approve', 400);

  // Claim the approval so the same milestone cannot be approved twice.
  const approved = await Milestone.findOneAndUpdate(
    { _id: milestone._id, status: MILESTONE_STATUS.SUBMITTED },
    { status: MILESTONE_STATUS.APPROVED, approvedAt: new Date() },
    { new: true }
  );
  if (!approved) throw new AppError('There is no submitted work to approve', 400);

  const commission = Math.round(approved.amount * contract.platformFeePercent) / 100;
  const net = Math.round((approved.amount - commission) * 100) / 100;

  let transaction = null;
  let released;
  try {
    // The uniqueKey stops a second payout for the same milestone, whatever happens.
    transaction = await Transaction.create({
      contract: contract._id,
      milestone: approved._id,
      payer: contract.client,
      payee: contract.freelancer,
      type: TRANSACTION_TYPE.RELEASE,
      amount: approved.amount,
      commission,
      netAmount: net,
      status: PAYMENT_STATUS.PAID,
      uniqueKey: `release:${approved._id}`,
    });
    await User.updateOne({ _id: contract.freelancer }, { $inc: { walletBalance: net } });
    released = await Milestone.findOneAndUpdate(
      { _id: approved._id },
      { status: MILESTONE_STATUS.RELEASED },
      { new: true }
    );
  } catch (err) {
    if (err.code === 11000) throw new AppError('This milestone has already been released', 400);
    // Undo what this request did so the client can try again.
    if (transaction) await Transaction.deleteOne({ _id: transaction._id });
    await Milestone.updateOne({ _id: approved._id, status: MILESTONE_STATUS.APPROVED }, { status: MILESTONE_STATUS.SUBMITTED });
    throw err;
  }

  // If every milestone is paid out, the contract and the project are complete.
  let contractCompleted = false;
  const remaining = await Milestone.countDocuments({ contract: contract._id, status: { $ne: MILESTONE_STATUS.RELEASED } });
  if (remaining === 0) {
    await Contract.updateOne({ _id: contract._id, status: CONTRACT_STATUS.ACTIVE }, { status: CONTRACT_STATUS.COMPLETED, completedAt: new Date() });
    await Project.updateOne({ _id: contract.project }, { status: PROJECT_STATUS.COMPLETED });
    contractCompleted = true;
  }

  await notify(contract.freelancer, {
    type: NOTIFICATION_TYPE.PAYMENT_RELEASED,
    message: `₹${net} was added to your wallet for "${approved.title}".`,
    link: `/contracts/${contract._id}`,
  });
  if (contractCompleted) {
    for (const person of [contract.client, contract.freelancer]) {
      await notify(person, {
        type: NOTIFICATION_TYPE.CONTRACT_COMPLETED,
        message: 'The contract is complete. You can now leave a review.',
        link: `/contracts/${contract._id}`,
      });
    }
  }

  res.json({ milestone: released, transaction, contractCompleted });
});
