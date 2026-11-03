import mongoose from 'mongoose';
import { BID_STATUS } from '../utils/constants.js';

// Optional payment plan the freelancer proposes inside the bid.
const milestonePlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    amount: { type: Number, required: true, min: 1 },
    dueDays: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const bidSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    deliveryDays: { type: Number, required: true, min: 1, max: 365 },
    coverLetter: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    milestones: [milestonePlanSchema],
    status: { type: String, enum: Object.values(BID_STATUS), default: BID_STATUS.PENDING },
  },
  { timestamps: true }
);

// One bid per freelancer per project - enforced by the database itself.
bidSchema.index({ project: 1, freelancer: 1 }, { unique: true });
bidSchema.index({ freelancer: 1, createdAt: -1 });
bidSchema.index({ project: 1, status: 1 });

const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
