import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, ConfirmAction, EmptyState, Field, RatingGiven, Spinner, Stars, StatusBadge } from '../components/ui';
import { inr, milestoneLabel, payout, shortDate } from '../utils/format';

const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// A row of dots showing how far along the contract is.
function ContractTrack({ milestones }) {
  const n = milestones.length;
  const released = milestones.filter((m) => m.status === 'RELEASED').length;
  const fill = n > 1 ? Math.min(released, n - 1) / (n - 1) : 0;

  return (
    <section aria-label="Contract progress" className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <p className="text-sm text-muted">
        {released} of {n} milestone{n === 1 ? '' : 's'} paid out
      </p>
      <div className="relative mt-6">
        {n > 1 && (
          <div className="absolute top-[14px] h-1 rounded bg-line" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} aria-hidden="true">
            <div className="h-full rounded bg-marigold transition-all duration-700" style={{ width: `${fill * 100}%` }} />
          </div>
        )}
        <ol className="relative grid text-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {milestones.map((m, i) => {
            const state = i < released ? 'done' : i === released ? 'current' : 'later';
            return (
              <li key={m._id} className="flex flex-col items-center px-1">
                {state === 'done' && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-peacock text-white">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  </span>
                )}
                {state === 'current' && <span className="h-8 w-8 rounded-full border-[6px] border-marigold-soft bg-marigold ring-2 ring-marigold" />}
                {state === 'later' && <span className="h-8 w-8 rounded-full border-2 border-line bg-white" />}
                <p className="mt-2 line-clamp-2 text-xs font-semibold sm:text-sm">{m.title}</p>
                <p className="text-xs text-muted">{inr(m.amount)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// The client pays for a milestone. This imitates a payment gateway's checkout (test mode, no real money).
function FundPanel({ milestone, onFunded }) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) {
    return <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Fund this milestone</button>;
  }

  const pay = async (e) => {
    e.preventDefault();
    setError('');
    if (!card.trim()) {
      setError('Enter the card number.');
      return;
    }
    setBusy(true);
    try {
      const { data: order } = await api.post('/api/payments/order', { milestoneId: milestone._id });
      const { data: gateway } = await api.post('/api/payments/simulate', { orderId: order.order.orderId, cardNumber: card });
      await api.post('/api/payments/verify', gateway);
      await onFunded();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} noValidate className="space-y-4 rounded-lg border border-line bg-mist p-4">
      <h4 className="font-semibold">Pay {inr(milestone.amount)}</h4>
      <Alert type="info">Test mode: no real money moves. Use the test card below.</Alert>
      {error && <Alert type="error">{error}</Alert>}
      <Field id={`card-${milestone._id}`} label="Card number" hint="Test card 4111 1111 1111 1111 succeeds. 4000 0000 0000 0002 is declined.">
        <input id={`card-${milestone._id}`} className="input" inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000 0000" value={card} onChange={(e) => setCard(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Processing...' : `Pay ${inr(milestone.amount)}`}</button>
        <button type="button" className="btn btn-outline" onClick={() => setCard('4111 1111 1111 1111')}>Use the test card</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// The freelancer hands in the work for a milestone.
function SubmitForm({ milestone, onDone }) {
  const [form, setForm] = useState({ note: '', links: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const links = form.links.split('\n').map((l) => l.trim()).filter(Boolean);
    const found = {};
    if (form.note.trim().length < 10) found.note = 'Describe what you delivered in at least 10 characters.';
    if (links.length > 5) found.links = 'Add at most 5 links.';
    else if (links.some((l) => !isHttpUrl(l))) found.links = 'Every link must start with http:// or https://';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api.patch(`/api/milestones/${milestone._id}/submit`, { note: form.note.trim(), links });
      await onDone();
    } catch (err) {
      setServerError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border border-line bg-mist p-4">
      <h4 className="font-semibold">Submit your work</h4>
      {serverError && <Alert type="error">{serverError}</Alert>}
      <Field id={`note-${milestone._id}`} label="What did you deliver?" error={errors.note}>
        <textarea id={`note-${milestone._id}`} name="note" rows={4} className="input" value={form.note} onChange={update} />
      </Field>
      <Field id={`links-${milestone._id}`} label="Links to the files or the live work (optional)" hint="One link per line, for example a Google Drive folder or a GitHub repository." error={errors.links}>
        <textarea id={`links-${milestone._id}`} name="links" rows={3} className="input" value={form.links} onChange={update} />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting...' : 'Submit work'}</button>
    </form>
  );
}

// The client asks for changes.
function RevisionForm({ milestone, onDone }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>Request changes</button>;
  }

  const send = async (e) => {
    e.preventDefault();
    setError('');
    if (notes.trim().length < 10) {
      setError('Explain what should change in at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/milestones/${milestone._id}/request-revision`, { notes: notes.trim() });
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={send} noValidate className="w-full space-y-3 rounded-lg border border-line bg-mist p-4">
      {error && <Alert type="error">{error}</Alert>}
      <Field id={`rev-${milestone._id}`} label="What should change?">
        <textarea id={`rev-${milestone._id}`} rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

function MilestoneCard({ m, index, activeIndex, contract, isClient, isFreelancer, onChanged }) {
  const isActive = index === activeIndex;
  const { fee, net } = payout(m.amount, contract.platformFeePercent);
  const freelancerName = contract.freelancer.name;
  const hasWork = ['SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'RELEASED'].includes(m.status) && m.submissionNote;

  const approve = async () => {
    const { data } = await api.patch(`/api/milestones/${m._id}/approve`);
    const t = data.transaction;
    await onChanged(
      `Released ${inr(t.netAmount)} to ${freelancerName} (platform fee ${inr(t.commission)}).${data.contractCompleted ? ' The contract is now complete. You can leave a review below.' : ''}`
    );
  };

  let action = null;
  if (isClient) {
    if (m.status === 'PENDING') {
      action = isActive ? <FundPanel milestone={m} onFunded={() => onChanged(`"${m.title}" is funded. ${freelancerName} can start working.`)} /> : <p className="text-sm text-muted">You can fund this after the earlier milestones are paid out.</p>;
    } else if (m.status === 'FUNDED') {
      action = <p className="text-sm text-muted">Funded. {freelancerName} is working on this milestone.</p>;
    } else if (m.status === 'SUBMITTED') {
      action = (
        <div className="flex flex-wrap items-start gap-2">
          <ConfirmAction tone="primary" label="Approve and release payment" question={`Approve this work and pay ${freelancerName} ${inr(net)}?`} confirmLabel="Yes, approve and pay" onConfirm={approve} />
          <RevisionForm milestone={m} onDone={() => onChanged('Your request for changes was sent.')} />
        </div>
      );
    } else if (m.status === 'REVISION_REQUESTED') {
      action = <p className="text-sm text-muted">You asked for changes. Waiting for {freelancerName} to resubmit.</p>;
    }
  } else if (isFreelancer) {
    if (m.status === 'PENDING') {
      action = <p className="text-sm text-muted">{isActive ? 'Waiting for the client to fund this milestone.' : 'This starts after the earlier milestones are paid out.'}</p>;
    } else if (m.status === 'FUNDED' || m.status === 'REVISION_REQUESTED') {
      action = <SubmitForm milestone={m} onDone={() => onChanged('Your work was submitted. The client has been notified.')} />;
    } else if (m.status === 'SUBMITTED') {
      action = <p className="text-sm text-muted">Waiting for the client to review your work.</p>;
    }
  }

  return (
    <article className={`rounded-xl border bg-white p-5 sm:p-6 ${isActive && contract.status === 'ACTIVE' ? 'border-peacock' : 'border-line'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted">Milestone {m.order}</p>
          <h3 className="text-lg font-semibold">{m.title}</h3>
          <p className="mt-1 text-sm text-muted">Due {shortDate(m.dueDate)}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <StatusBadge status={m.status} label={milestoneLabel(m.status)} />
          <p className="mt-2 font-display text-2xl font-semibold">{inr(m.amount)}</p>
        </div>
      </div>

      {hasWork && (
        <div className="mt-4 rounded-lg bg-mist p-4 text-sm">
          <p className="font-semibold">Submitted work</p>
          <p className="mt-1 whitespace-pre-line">{m.submissionNote}</p>
          {m.submissionFiles?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {m.submissionFiles.map((f) => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-peacock-deep hover:underline">{f.url}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {m.status === 'REVISION_REQUESTED' && m.revisionNotes && (
        <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
          <p className="font-semibold">Changes requested</p>
          <p className="mt-1 whitespace-pre-line">{m.revisionNotes}</p>
        </div>
      )}
      {m.status === 'RELEASED' && (
        <p className="mt-4 text-sm text-muted">
          {freelancerName} received {inr(net)} after a platform fee of {inr(fee)}.
        </p>
      )}

      {action && contract.status === 'ACTIVE' && <div className="mt-4 border-t border-line pt-4">{action}</div>}
    </article>
  );
}

function ReviewSection({ contract, user }) {
  const [state, setState] = useState({ loading: true, reviews: [], canReview: false, error: '' });
  const [form, setForm] = useState({ rating: '', comment: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);

  const isClient = user._id === contract.client._id;
  const other = isClient ? contract.freelancer : contract.client;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/reviews/contract/${contract._id}`);
      setState({ loading: false, reviews: data.reviews, canReview: data.canReview, error: '' });
    } catch (err) {
      setState({ loading: false, reviews: [], canReview: false, error: errorMessage(err) });
    }
  }, [contract._id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.rating) {
      setError('Choose a rating from 1 to 5 stars.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/reviews', { contractId: contract._id, rating: Number(form.rating), comment: form.comment.trim() });
      setThanks(true);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">Reviews</h2>
      {state.loading && <Spinner label="Loading reviews" />}
      {state.error && <div className="mt-3"><Alert type="error">{state.error}</Alert></div>}
      {thanks && <div className="mt-3"><Alert type="success">Thank you. Your review was posted.</Alert></div>}

      {state.reviews.length > 0 && (
        <ul className="mt-4 space-y-3">
          {state.reviews.map((r) => (
            <li key={r._id} className="rounded-xl border border-line bg-white p-5">
              <RatingGiven value={r.rating} />
              {r.comment && <p className="mt-2 whitespace-pre-line text-sm">{r.comment}</p>}
              <p className="mt-3 text-xs text-muted">From {r.reviewer.name} ({r.reviewerRole})</p>
            </li>
          ))}
        </ul>
      )}

      {state.canReview && (
        <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-xl border border-line bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold">How was it working with {other.name}?</h3>
          {error && <Alert type="error">{error}</Alert>}
          <fieldset>
            <legend className="label">Your rating</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${Number(form.rating) === n ? 'border-peacock bg-peacock-soft' : 'border-line bg-white hover:border-peacock'}`}>
                  <input type="radio" name="rating" value={n} checked={Number(form.rating) === n} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="sr-only" />
                  {n} star{n === 1 ? '' : 's'}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="review-comment" label="Your comment (optional)" hint={`${form.comment.length}/1000 characters`}>
            <textarea id="review-comment" rows={4} maxLength={1000} className="input" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Posting...' : 'Post review'}</button>
        </form>
      )}

      {!state.loading && !state.canReview && state.reviews.length === 0 && !state.error && (
        <p className="mt-3 text-sm text-muted">No reviews yet.</p>
      )}
    </section>
  );
}

export default function ContractPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', contract: null, milestones: [] });
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/contracts/${id}`);
      setState({ loading: false, error: '', contract: data.contract, milestones: data.milestones });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), contract: null, milestones: [] });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = async (message) => {
    setNotice(message);
    await load();
  };

  if (state.loading) return <Spinner label="Loading contract" />;
  if (state.error || !state.contract) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="You cannot open this contract" action={<Link to="/contracts" className="btn btn-primary">Back to contracts</Link>}>
          {state.error}
        </EmptyState>
      </div>
    );
  }

  const { contract, milestones } = state;
  const isClient = user._id === contract.client._id;
  const isFreelancer = user._id === contract.freelancer._id;
  const activeIndex = milestones.findIndex((m) => m.status !== 'RELEASED');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/contracts" className="text-sm font-medium text-peacock-deep hover:underline">All contracts</Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={contract.status} />
        {contract.status === 'COMPLETED' && contract.completedAt && <span className="text-sm text-muted">Completed on {shortDate(contract.completedAt)}</span>}
        {(isClient || isFreelancer) && (
          <Link to={`/chat/contract/${contract._id}`} className="btn btn-outline ml-auto">
            Message {isClient ? contract.freelancer.name : contract.client.name}
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold">
        {contract.project ? <Link to={`/projects/${contract.project._id}`} className="hover:text-peacock-deep hover:underline">{contract.project.title}</Link> : 'Project removed'}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[['Client', contract.client], ['Freelancer', contract.freelancer]].map(([label, person]) => (
          <div key={label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar name={person.name} src={person.avatar} size="md" />
              <div className="min-w-0">
                <Link to={`/profile/${person._id}`} className="block truncate font-semibold hover:text-peacock-deep hover:underline">{person.name}</Link>
                <Stars value={person.ratingAverage} count={person.ratingCount} />
              </div>
            </div>
          </div>
        ))}
        <dl className="rounded-xl border border-line bg-white p-4">
          <dt className="text-sm text-muted">Contract value</dt>
          <dd className="font-display text-2xl font-semibold">{inr(contract.totalAmount)}</dd>
          <dd className="text-sm text-muted">Due {shortDate(contract.dueDate)}</dd>
          <dd className="text-sm text-muted">{contract.platformFeePercent}% platform fee on each payout</dd>
        </dl>
      </div>

      <div className="mt-6">
        <ContractTrack milestones={milestones} />
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {notice && <Alert type="success">{notice}</Alert>}
        {!isClient && !isFreelancer && <Alert type="info">You are viewing this contract as an administrator. It is read-only.</Alert>}
      </div>

      <h2 className="mt-8 text-2xl font-bold">Milestones</h2>
      <div className="mt-4 space-y-4">
        {milestones.map((m, i) => (
          <MilestoneCard key={m._id} m={m} index={i} activeIndex={activeIndex} contract={contract} isClient={isClient} isFreelancer={isFreelancer} onChanged={changed} />
        ))}
      </div>

      {contract.status === 'COMPLETED' && (isClient || isFreelancer) && <ReviewSection contract={contract} user={user} />}
    </div>
  );
}
