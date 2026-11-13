import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './models/User.js';
import Conversation from './models/Conversation.js';

let io = null;

const room = (userId) => `user:${userId}`;

// Sends an event to every browser tab/device the user has open. Does nothing if nobody is connected.
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  // Convert to plain JSON first so Mongoose objects are sent cleanly.
  io.to(room(userId)).emit(event, JSON.parse(JSON.stringify(payload)));
};

export const isUserOnline = async (userId) => {
  if (!io) return false;
  const sockets = await io.in(room(userId)).fetchSockets();
  return sockets.length > 0;
};

// The people this user has a chat with.
const getPartnerIds = async (userId) => {
  const convs = await Conversation.find({ participants: userId }).select('participants');
  const ids = new Set();
  for (const c of convs) {
    for (const p of c.participants) if (!p.equals(userId)) ids.add(String(p));
  }
  return [...ids];
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Every connection must present a valid login token: io(url, { auth: { token } })
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(new Error('Not logged in'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || user.isBlocked) return next(new Error('Not allowed'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.data.user._id);
    socket.join(room(userId));

    try {
      const partners = await getPartnerIds(userId);

      // Tell this user which of their chat partners are online right now.
      const online = [];
      for (const p of partners) if (await isUserOnline(p)) online.push(p);
      socket.emit('presence:list', online);

      // If this is the user's first open tab, tell the partners they are online.
      const mine = await io.in(room(userId)).fetchSockets();
      if (mine.length === 1) {
        for (const p of partners) emitToUser(p, 'presence', { userId, online: true });
      }
    } catch (err) {
      console.error('Socket presence error:', err.message);
    }

    // "Typing..." indicator: only forwarded to the other person in that conversation.
    socket.on('typing', async (payload) => {
      try {
        const { conversationId, isTyping } = payload || {};
        if (typeof conversationId !== 'string' || !mongoose.isValidObjectId(conversationId)) return;
        const conv = await Conversation.findById(conversationId).select('participants');
        if (!conv || !conv.participants.some((p) => p.equals(userId))) return;
        const other = conv.participants.find((p) => !p.equals(userId));
        emitToUser(other, 'typing', { conversationId, userId, isTyping: !!isTyping });
      } catch {
        /* ignore malformed typing events */
      }
    });

    socket.on('disconnect', async () => {
      try {
        // Offline only when the user's last tab is closed.
        if (await isUserOnline(userId)) return;
        const partners = await getPartnerIds(userId);
        for (const p of partners) emitToUser(p, 'presence', { userId, online: false });
      } catch {
        /* ignore */
      }
    });
  });

  return io;
};
