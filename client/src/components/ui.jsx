import { useState } from 'react';
import { initials } from '../utils/format';

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-peacock" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

const alertStyles = {
  error: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-peacock/30 bg-peacock-soft text-peacock-deep',
};

export function Alert({ type = 'info', children }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${alertStyles[type]}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const statusStyles = {
  OPEN: 'bg-emerald-100 text-emerald-900',
  IN_PROGRESS: 'bg-peacock-soft text-peacock-deep',
  COMPLETED: 'bg-slate-200 text-slate-800',
  CLOSED: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-marigold-soft text-amber-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-red-100 text-red-900',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-peacock-soft text-peacock-deep',
  CANCELLED: 'bg-slate-100 text-slate-600',
  FUNDED: 'bg-peacock-soft text-peacock-deep',
  SUBMITTED: 'bg-sky-100 text-sky-900',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-900',
  RELEASED: 'bg-emerald-100 text-emerald-900',
};

export function StatusBadge({ status, label }) {
  const text = label || status.replace('_', ' ').toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] || 'bg-slate-100'}`}>
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
}

export function Stars({ value = 0, count = 0 }) {
  if (!count) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm" title={`${value} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-marigold" aria-hidden="true">
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
      </svg>
      <span className="font-semibold">{Number(value).toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </span>
  );
}

// The rating a person gave in ONE review, for example "5 out of 5".
export function RatingGiven({ value }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-marigold" aria-hidden="true">
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
      </svg>
      {value} out of 5
    </span>
  );
}

export function Avatar({ name, src, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${sizes[size]}`} />;
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-peacock font-semibold text-white ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`gap-${i}`} className="px-2 text-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`btn min-w-10 ${p === page ? 'btn-primary' : 'btn-outline'}`}
          >
            {p}
          </button>
        )
      )}
      <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}

// A button that asks "are you sure?" in place, instead of a pop-up window.
// tone: "danger" for destructive actions, "primary" for positive ones.
export function ConfirmAction({ label, question, confirmLabel = 'Yes', onConfirm, tone = 'danger', disabled = false }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        className={`btn btn-outline ${tone === 'danger' ? 'text-red-800 hover:border-red-700 hover:text-red-800' : ''}`}
      >
        {label}
      </button>
    );
  }

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <div role="group" aria-label={question} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-mist p-2">
      <span className="px-1 text-sm">{question}</span>
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className={`btn ${tone === 'danger' ? 'bg-red-700 text-white hover:bg-red-800' : 'btn-primary'}`}
      >
        {busy ? 'Working...' : confirmLabel}
      </button>
      <button type="button" disabled={busy} onClick={() => setAsking(false)} className="btn btn-ghost">
        Cancel
      </button>
    </div>
  );
}
