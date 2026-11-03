import mongoose from 'mongoose';
import { MILESTONE_STATUS } from '../utils/constants.js';

const milestoneSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    order: { type: Number, required: true }, // 1, 2, 3 ...
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(MILESTONE_STATUS), default: MILESTONE_STATUS.PENDING },

    // Used in the next step (work submission and revisions)
    submissionNote: { type: String, default: '' },
    submissionFiles: [{ url: String, name: String }],
    revisionNotes: { type: String, default: '' },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

milestoneSchema.index({ contract: 1, order: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;
