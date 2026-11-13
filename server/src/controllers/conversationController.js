import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Contract from '../models/Contract.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { NOTIFICATION_TYPE } from '../utils/constants.js';
import { str } from '../utils/validators.js';
import { emitToUser, isUserOnline } from '../socket.js';
import { notify } from '../services/notificationService.js';

const loadConversation = async (id, userId) => {
  const conv = await Conversation.findById(id);
  if (!conv) throw new AppError('Conversation not found', 404);
  if (!conv.participants.some((p) => p.equals(userId))) {
    throw new AppError('You are not part of this conversation', 403);
  }
  return conv;
};

const otherPerson = (conv, userId) => conv.participants.find((p) => !p.equals(userId));

// GET /api/conversations  - all my chats, newest activity first, with unread counts
export const listConversations = asyncHandler(async (req, res) => {
  const me = req.user._id;

  // Make sure every contract of mine has a chat room (older contracts may not have one yet).
  const contracts = await Contract.find({ $or: [{ client: me }, { freelancer: me }] }).select('project client freelancer');
  if (contracts.length) {
    const existing = await Conversation.find({ contract: { $in: contracts.map((c) => c._id) } }).select('contract');
    const have = new Set(existing.map((c) => String(c.contract)));
    const missing = contracts.filter((c) => !have.has(String(c._id)));
    if (missing.length) {
      await Conversation.insertMany(
        missing.map((c) => ({ contract: c._id, project: c.project, participants: [c.client, c.freelancer] })),
        { ordered: false }
      ).catch(() => {}); // another request may have created it at the same moment
    }
  }

  const convs = await Conversation.find({ participants: me })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate('participants', 'name avatar role company')
    .populate('project', 'title');

  const conversations = await Promise.all(
    convs.map(async (c) => ({
      _id: c._id,
      contract: c.contract,
      project: c.project,
      other: c.participants.find((p) => !p._id.equals(me)),
      lastMessage: c.lastMessage?.text ? c.lastMessage : null,
      unreadCount: await Message.countDocuments({ conversation: c._id, sender: { $ne: me }, readBy: { $ne: me } }),
      updatedAt: c.updatedAt,
    }))
  );

  res.json({ conversations, totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0) });
});

// GET /api/conversations/by-contract/:contractId  - open (or create) the chat for a contract
export const getByContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new AppError('Contract not found', 404);
  if (!contract.client.equals(req.user._id) && !contract.freelancer.equals(req.user._id)) {
    throw new AppError('You do not have access to this contract', 403);
  }

  let conv = await Conversation.findOne({ contract: contract._id });
  if (!conv) {
    try {
      conv = await Conversation.create({ contract: contract._id, project: contract.project, participants: [contract.client, contract.freelancer] });
    } catch (err) {
      if (err.code !== 11000) throw err;
      conv = await Conversation.findOne({ contract: contract._id });
    }
  }
  res.json({ conversation: conv });
});

// GET /api/conversations/:id/messages?before=<messageId>&limit=30
export const getMessages = asyncHandler(async (req, res) => {
  const conv = await loadConversation(req.params.id, req.user._id);

  const limit = Math.min(100, Math.max(1, parseInt(str(req.query.limit), 10) || 30));
  const filter = { conversation: conv._id };
  const before = str(req.query.before);
  if (before) {
    if (!mongoose.isValidObjectId(before)) throw new AppError('Invalid "before" value', 400);
    filter._id = { $lt: before };
  }

  // Fetch one extra row to know whether older messages exist.
  const rows = await Message.find(filter).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse(); // oldest first, ready to display

  res.json({ messages, hasMore });
});

// POST /api/conversations/:id/messages  { text }
export const sendMessage = asyncHandler(async (req, res) => {
  const conv = await loadConversation(req.params.id, req.user._id);
  const me = req.user._id;

  const { text } = req.body;
  if (typeof text !== 'string' || text.trim().length < 1 || text.trim().length > 2000) {
    throw new AppError('A message must be 1 to 2000 characters', 400);
  }
  const clean = text.trim();

  const message = await Message.create({ conversation: conv._id, sender: me, text: clean, readBy: [me] });
  conv.lastMessage = { text: clean.slice(0, 200), sender: me, createdAt: message.createdAt };
  await conv.save();

  // Deliver instantly to the other person (and to my other open tabs).
  const other = otherPerson(conv, me);
  const payload = { conversationId: conv._id, message, sender: { _id: me, name: req.user.name, avatar: req.user.avatar } };
  emitToUser(other, 'message:new', payload);
  emitToUser(me, 'message:new', payload);

  // If they are not online, leave a notification so they notice later.
  if (!(await isUserOnline(other))) {
    await notify(other, {
      type: NOTIFICATION_TYPE.NEW_MESSAGE,
      message: `${req.user.name}: ${clean.slice(0, 120)}`,
      link: `/chat/${conv._id}`,
    });
  }

  res.status(201).json({ message });
});

// PATCH /api/conversations/:id/read  - mark everything the other person sent as read
export const markRead = asyncHandler(async (req, res) => {
  const conv = await loadConversation(req.params.id, req.user._id);
  const me = req.user._id;

  const result = await Message.updateMany(
    { conversation: conv._id, readBy: { $ne: me } },
    { $addToSet: { readBy: me } }
  );

  emitToUser(otherPerson(conv, me), 'messages:read', { conversationId: conv._id, by: me });
  res.json({ updated: result.modifiedCount });
});
