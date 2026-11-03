import Contract from '../models/Contract.js';
import Milestone from '../models/Milestone.js';
import { PLATFORM_FEE_PERCENT } from '../utils/constants.js';

const DAY = 24 * 60 * 60 * 1000;

// Creates the contract and its milestones from an accepted bid.
// If the bid has its own milestone plan we use it, otherwise one milestone covers the whole amount.
export const createContractFromBid = async (project, bid) => {
  const now = Date.now();

  const contract = await Contract.create({
    project: project._id,
    client: project.client,
    freelancer: bid.freelancer,
    bid: bid._id,
    totalAmount: bid.amount,
    deliveryDays: bid.deliveryDays,
    dueDate: new Date(now + bid.deliveryDays * DAY),
    platformFeePercent: PLATFORM_FEE_PERCENT,
  });

  const plan = bid.milestones.length
    ? bid.milestones.map((m) => ({ title: m.title, amount: m.amount, dueDays: m.dueDays }))
    : [{ title: 'Complete project', amount: bid.amount, dueDays: bid.deliveryDays }];

  try {
    const milestones = await Milestone.insertMany(
      plan.map((m, i) => ({
        contract: contract._id,
        order: i + 1,
        title: m.title,
        amount: m.amount,
        dueDate: new Date(now + m.dueDays * DAY),
      }))
    );
    return { contract, milestones };
  } catch (err) {
    // Do not leave a half-built contract behind.
    await Milestone.deleteMany({ contract: contract._id });
    await Contract.deleteOne({ _id: contract._id });
    throw err;
  }
};
