import mongoose from 'mongoose';
import { TRANSACTION_TYPE, PAYMENT_STATUS } from '../utils/constants.js';

const transactionSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', required: true },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
    amount: { type: Number, required: true, min: 0 }, // full milestone amount
    commission: { type: Number, default: 0, min: 0 }, // platform fee (RELEASE only)
    netAmount: { type: Number, required: true, min: 0 }, // what the receiver gets
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },

    // Gateway details (for FUND transactions)
    orderId: { type: String },
    paymentId: { type: String },

    // Database-level guard: "fund:<milestoneId>" or "release:<milestoneId>" can exist only once,
    // so a milestone can never be paid in or paid out twice, even if two requests race.
    uniqueKey: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ orderId: 1 }, { unique: true, sparse: true });
transactionSchema.index({ uniqueKey: 1 }, { unique: true, sparse: true });
transactionSchema.index({ payer: 1, createdAt: -1 });
transactionSchema.index({ payee: 1, createdAt: -1 });
transactionSchema.index({ milestone: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
