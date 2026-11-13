import mongoose from 'mongoose';

// One private chat room per contract, shared by the client and the freelancer.
const conversationSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ contract: 1 }, { unique: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
