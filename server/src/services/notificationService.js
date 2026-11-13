import Notification from '../models/Notification.js';
import { emitToUser } from '../socket.js';

// Saves a notification and pushes it to the user instantly if they are online.
// It never throws, so a notification problem can never break the main action.
export const notify = async (userId, { type, message, link = '' }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      message: message.length > 300 ? `${message.slice(0, 297)}...` : message,
      link,
    });
    emitToUser(userId, 'notification', notification);
    return notification;
  } catch (err) {
    console.error('Could not create notification:', err.message);
    return null;
  }
};
