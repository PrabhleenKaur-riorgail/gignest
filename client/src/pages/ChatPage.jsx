import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Alert, Avatar, EmptyState, Spinner } from '../components/ui';
import { timeAgo } from '../utils/format';

const clock = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function OnlineDot({ online }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />;
}

function ConversationList({ list, activeId, online }) {
  if (list.loading) return <Spinner label="Loading conversations" />;
  if (list.error) return <Alert type="error">{list.error}</Alert>;
  if (list.conversations.length === 0) {
    return (
      <EmptyState title="No conversations yet">
        A chat opens automatically when a client accepts a bid. You will find it here.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {list.conversations.map((c) => (
        <li key={c._id}>
          <Link
            to={`/chat/${c._id}`}
            aria-current={c._id === activeId ? 'page' : undefined}
            className={`flex items-start gap-3 p-4 hover:bg-mist ${c._id === activeId ? 'bg-peacock-soft/50' : ''}`}
          >
            <Avatar name={c.other.name} src={c.other.avatar} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-semibold">{c.other.name}</span>
                <OnlineDot online={online.has(c.other._id)} />
                {c.unreadCount > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1.5 text-xs font-bold text-ink">
                    <span className="sr-only">{c.unreadCount} unread messages</span>
                    <span aria-hidden="true">{c.unreadCount}</span>
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted">{c.project?.title}</span>
              <span className="mt-0.5 block truncate text-sm">
                {c.lastMessage ? c.lastMessage.text : <span className="text-muted">No messages yet</span>}
              </span>
              {c.lastMessage && <span className="block text-xs text-muted">{timeAgo(c.lastMessage.createdAt)}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ id, conversation, me, onRead }) {
  const { socket, online, refreshUnread } = useRealtime();
  const [state, setState] = useState({ loading: true, error: '', messages: [], hasMore: false });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const idleTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const other = conversation?.other;

  const markRead = useCallback(async () => {
    try {
      await api.patch(`/api/conversations/${id}/read`);
      refreshUnread();
      onRead?.(); // refresh the list on the left, so its unread badge disappears
    } catch {
      /* ignore */
    }
  }, [id, refreshUnread, onRead]);

  // First page of messages.
  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', messages: [], hasMore: false });
    setTyping(false);
    api
      .get(`/api/conversations/${id}/messages`, { params: { limit: 30 } })
      .then((res) => {
        if (!alive) return;
        setState({ loading: false, error: '', messages: res.data.messages, hasMore: res.data.hasMore });
        markRead();
      })
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), messages: [], hasMore: false }));
    return () => {
      alive = false;
    };
  }, [id, markRead]);

  // Live events for this conversation.
  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (p) => {
      if (p.conversationId !== id) return;
      setState((s) => (s.messages.some((m) => m._id === p.message._id) ? s : { ...s, messages: [...s.messages, p.message] }));
      if (p.message.sender !== me) {
        setTyping(false);
        markRead();
      }
    };
    const onTyping = (p) => {
      if (p.conversationId !== id || p.userId === me) return;
      setTyping(p.isTyping);
      clearTimeout(typingTimer.current);
      if (p.isTyping) typingTimer.current = setTimeout(() => setTyping(false), 4000);
    };
    const onRead = (p) => {
      if (p.conversationId !== id) return;
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (m.sender === me && !m.readBy.includes(p.by) ? { ...m, readBy: [...m.readBy, p.by] } : m)),
      }));
    };
    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);
    socket.on('messages:read', onRead);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
      socket.off('messages:read', onRead);
      clearTimeout(typingTimer.current);
    };
  }, [socket, id, me, markRead]);

  // Keep the newest message in view.
  const lastId = state.messages[state.messages.length - 1]?._id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastId, typing]);

  const emitTyping = (isTyping) => socket?.emit('typing', { conversationId: id, isTyping });

  const onType = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      emitTyping(true);
      lastTypingSent.current = now;
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      emitTyping(false);
      lastTypingSent.current = 0;
    }, 2500);
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      const { data } = await api.post(`/api/conversations/${id}/messages`, { text: body });
      setState((s) => (s.messages.some((m) => m._id === data.message._id) ? s : { ...s, messages: [...s.messages, data.message] }));
      setText('');
      clearTimeout(idleTimer.current);
      emitTyping(false);
      lastTypingSent.current = 0;
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  };

  const loadOlder = async () => {
    const first = state.messages[0];
    try {
      const { data } = await api.get(`/api/conversations/${id}/messages`, { params: { limit: 30, before: first._id } });
      setState((s) => ({ ...s, messages: [...data.messages, ...s.messages], hasMore: data.hasMore }));
    } catch (err) {
      setSendError(errorMessage(err));
    }
  };

  if (state.error) {
    return (
      <EmptyState title="You cannot open this conversation" action={<Link to="/chat" className="btn btn-primary">Back to messages</Link>}>
        {state.error}
      </EmptyState>
    );
  }

  const otherOnline = other ? online.has(other._id) : false;
  const lastMine = [...state.messages].reverse().find((m) => m.sender === me);
  const seen = Boolean(other && lastMine && lastMine.readBy.includes(other._id));

  return (
    <section aria-label="Conversation" className="flex h-[70vh] min-h-[28rem] flex-col overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/chat" className="text-sm font-medium text-peacock-deep hover:underline md:hidden">All</Link>
        {other && <Avatar name={other.name} src={other.avatar} />}
        <div className="min-w-0 flex-1">
          {other ? (
            <Link to={`/profile/${other._id}`} className="block truncate font-semibold hover:text-peacock-deep hover:underline">{other.name}</Link>
          ) : (
            <p className="font-semibold">Conversation</p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <OnlineDot online={otherOnline} />
            <span>{otherOnline ? 'Online' : 'Offline'}</span>
            {conversation?.project && <span className="truncate">about {conversation.project.title}</span>}
          </p>
        </div>
        {conversation?.contract && <Link to={`/contracts/${conversation.contract}`} className="btn btn-outline hidden sm:inline-flex">View contract</Link>}
      </header>

      <div role="log" aria-label="Messages" aria-live="polite" className="flex-1 space-y-2 overflow-y-auto bg-mist px-4 py-4">
        {state.loading && <Spinner label="Loading messages" />}
        {state.hasMore && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} className="btn btn-outline">Load earlier messages</button>
          </div>
        )}
        {!state.loading && state.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello.</p>
        )}
        {state.messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-sm bg-peacock text-white' : 'rounded-bl-sm border border-line bg-white'}`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-white/75' : 'text-muted'}`}>{clock(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        {seen && <p className="text-right text-xs text-muted">Seen</p>}
        {typing && other && <p className="text-sm italic text-muted">{other.name} is typing...</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {sendError && <div className="mb-2"><Alert type="error">{sendError}</Alert></div>}
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">Write a message</label>
          <textarea
            id="message"
            rows={2}
            maxLength={2000}
            className="input resize-none"
            placeholder="Write a message. Press Enter to send."
            value={text}
            onChange={onType}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>Send</button>
        </div>
      </form>
    </section>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, online } = useRealtime();
  const [list, setList] = useState({ loading: true, error: '', conversations: [] });
  const latestLoad = useRef(0);

  // If several reloads overlap, only the answer to the newest request is used,
  // so a slow, older answer can never overwrite fresher data.
  const loadList = useCallback(async () => {
    const mine = ++latestLoad.current;
    try {
      const { data } = await api.get('/api/conversations');
      if (mine === latestLoad.current) setList({ loading: false, error: '', conversations: data.conversations });
    } catch (err) {
      if (mine === latestLoad.current) setList({ loading: false, error: errorMessage(err), conversations: [] });
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, id]);

  // Keep the list fresh when messages arrive or are read.
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('message:new', loadList);
    socket.on('messages:read', loadList);
    return () => {
      socket.off('message:new', loadList);
      socket.off('messages:read', loadList);
    };
  }, [socket, loadList]);

  const active = list.conversations.find((c) => c._id === id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="mt-1 text-muted">Talk to the people you work with. Messages arrive instantly.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[20rem_1fr]">
        <div className={id ? 'hidden md:block' : 'block'}>
          <ConversationList list={list} activeId={id} online={online} />
        </div>
        <div className={id ? 'block' : 'hidden md:block'}>
          {id ? (
            <Thread key={id} id={id} conversation={active} me={user._id} onRead={loadList} />
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-white px-6 py-20 text-center text-muted">Choose a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
}
