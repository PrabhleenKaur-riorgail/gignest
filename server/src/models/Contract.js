import mongoose from 'mongoose';
import { CONTRACT_STATUS } from '../utils/constants.js';

const contractSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', required: true },
    totalAmount: { type: Number, required: true, min: 1 },
    deliveryDays: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    platformFeePercent: { type: Number, required: true, min: 0, max: 100 },
    status: { type: String, enum: Object.values(CONTRACT_STATUS), default: CONTRACT_STATUS.ACTIVE },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// A project can only ever have one contract.
contractSchema.index({ project: 1 }, { unique: true });
contractSchema.index({ client: 1, createdAt: -1 });
contractSchema.index({ freelancer: 1, createdAt: -1 });

const Contract = mongoose.model('Contract', contractSchema);
export default Contract;
