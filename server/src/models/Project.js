import mongoose from 'mongoose';
import { CATEGORIES, PROJECT_STATUS } from '../utils/constants.js';

const projectSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    category: { type: String, required: true, enum: CATEGORIES },
    skills: [{ type: String, trim: true, lowercase: true }],
    budgetMin: { type: Number, required: true, min: 0 },
    budgetMax: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    attachments: [{ url: String, name: String }], // filled when file upload is added
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.OPEN,
    },
    bidCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes that make the common searches fast.
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ client: 1, createdAt: -1 });
projectSchema.index({ category: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
