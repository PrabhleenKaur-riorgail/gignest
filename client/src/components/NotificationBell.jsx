import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../context/RealtimeContext';
import { timeAgo } from '../utils/format';

export default function NotificationBell() {
  const { notifications, markRead, markAllRead } = useRealtime();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { items, unread } = notifications;

  // Close when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (n) => {
    setOpen(false);
    if (!n.isRead) markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative rounded-lg p-2 hover:bg-peacock-soft"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1 text-[11px] font-bold text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white shadow-[0_20px_50px_-20px_rgba(15,42,48,0.45)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-sm font-semibold text-peacock-deep hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n._id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => choose(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-mist ${n.isRead ? '' : 'bg-peacock-soft/40'}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-peacock'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{n.message}</span>
                      <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt)}{n.isRead ? '' : ', unread'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
