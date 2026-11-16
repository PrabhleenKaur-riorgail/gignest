import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { getToken } from '../api';
import { useAuth } from './AuthContext';

const noop = () => {};

// Safe defaults, so a page still works if it is shown without the provider.
const RealtimeContext = createContext({
  socket: null,
  online: new Set(),
  unreadMessages: 0,
  refreshUnread: noop,
  notifications: { items: [], unread: 0 },
  markRead: noop,
  markAllRead: noop,
  toasts: [],
  dismissToast: noop,
});

// Keeps one live connection to the server while someone is logged in, and shares what arrives:
// who is online, how many messages and notifications are unread, and little pop-up messages.
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(() => new Set());
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const pushToast = useCallback(
    (toast) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, ...toast }]);
      setTimeout(() => dismissToast(id), 7000);
    },
    [dismissToast]
  );

  const latestUnread = useRef(0);
  const refreshUnread = useCallback(() => {
    const mine = ++latestUnread.current;
    api
      .get('/api/conversations')
      .then((res) => {
        if (mine === latestUnread.current) setUnreadMessages(res.data.totalUnread); // ignore out-of-date answers
      })
      .catch(() => {});
  }, []);

  const loadNotifications = useCallback(() => {
    api
      .get('/api/notifications', { params: { limit: 10 } })
      .then((res) => setNotifications({ items: res.data.notifications, unread: res.data.unreadCount }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) {
      setSocket(null);
      setOnline(new Set());
      setUnreadMessages(0);
      setNotifications({ items: [], unread: 0 });
      return undefined;
    }

    const s = io(import.meta.env.VITE_API_URL || undefined, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    });
    setSocket(s);

    s.on('presence:list', (ids) => setOnline(new Set(ids)));
    s.on('presence', ({ userId: who, online: isOnline }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(who);
        else next.delete(who);
        return next;
      })
    );
    s.on('notification', (n) => {
      setNotifications((prev) => ({ items: [n, ...prev.items].slice(0, 10), unread: prev.unread + 1 }));
      pushToast({ message: n.message, link: n.link });
    });
    s.on('message:new', (payload) => {
      if (payload.message.sender === userId) return; // my own message
      refreshUnread();
      if (pathRef.current !== `/chat/${payload.conversationId}`) {
        pushToast({ message: `${payload.sender.name}: ${payload.message.text.slice(0, 80)}`, link: `/chat/${payload.conversationId}` });
      }
    });
    s.on('connect_error', noop);

    loadNotifications();
    refreshUnread();

    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, [userId, loadNotifications, refreshUnread, pushToast]);

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) => {
        const target = prev.items.find((n) => n._id === id);
        return {
          items: prev.items.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
          unread: target && !target.isRead ? Math.max(0, prev.unread - 1) : prev.unread,
        };
      });
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => ({ items: prev.items.map((n) => ({ ...n, isRead: true })), unread: 0 }));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ socket, online, unreadMessages, refreshUnread, notifications, markRead, markAllRead, toasts, dismissToast }),
    [socket, online, unreadMessages, refreshUnread, notifications, markRead, markAllRead, toasts, dismissToast]
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
