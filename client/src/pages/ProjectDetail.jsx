import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, EmptyState, Field, Spinner, Stars, StatusBadge } from '../components/ui';
import { budgetRange, deadlineText, inr, shortDate, timeAgo } from '../utils/format';

function BidForm({ project, onPlaced }) {
  const [form, setForm] = useState({ amount: '', deliveryDays: '', coverLetter: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const amount = Number(form.amount);
    const days = Number(form.deliveryDays);
    const found = {};
    if (!form.amount || Number.isNaN(amount) || amount < 1) found.amount = 'Enter your price in rupees (at least 1).';
    if (!Number.isInteger(days) || days < 1 || days > 365) found.deliveryDays = 'Enter a whole number of days from 1 to 365.';
    if (form.coverLetter.trim().length < 20) found.coverLetter = 'Write at least 20 characters about why you are a good fit.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const { data } = await api.post(`/api/projects/${project._id}/bids`, {
        amount,
        deliveryDays: days,
        coverLetter: form.coverLetter.trim(),
      });
      onPlaced(data.bid);
    } catch (err) {
      setServerError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5" noValidate>
      <h2 className="text-lg font-semibold">Place your bid</h2>
      {serverError && <Alert type="error">{serverError}</Alert>}
      <Field id="amount" label="Your price (₹)" hint={`The client's budget is ${budgetRange(project.budgetMin, project.budgetMax)}.`} error={errors.amount}>
        <input id="amount" name="amount" type="number" min="1" className="input" value={form.amount} onChange={update} />
      </Field>
      <Field id="deliveryDays" label="Delivery time (days)" error={errors.deliveryDays}>
        <input id="deliveryDays" name="deliveryDays" type="number" min="1" max="365" className="input" value={form.deliveryDays} onChange={update} />
      </Field>
      <Field id="coverLetter" label="Cover letter" hint={`${form.coverLetter.trim().length}/2000 characters`} error={errors.coverLetter}>
        <textarea id="coverLetter" name="coverLetter" rows={5} maxLength={2000} className="input" value={form.coverLetter} onChange={update} />
      </Field>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Sending bid...' : 'Send bid'}
      </button>
    </form>
  );
}

function BidSummary({ bid, justPlaced }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-5">
      {justPlaced && <Alert type="success">Your bid was sent. The client has been notified.</Alert>}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your bid</h2>
        <StatusBadge status={bid.status} />
      </div>
      <p className="font-display text-2xl font-semibold">{inr(bid.amount)}</p>
      <p className="text-sm text-muted">Delivery in {bid.deliveryDays} day{bid.deliveryDays === 1 ? '' : 's'}</p>
      <p className="whitespace-pre-line border-t border-line pt-3 text-sm">{bid.coverLetter}</p>
    </div>
  );
}

function BidArea({ project, onBidPlaced }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const isFreelancer = user?.role === 'freelancer';
  // "checked" turns true once we know whether this freelancer already has a bid on the project.
  const [myBid, setMyBid] = useState({ checked: false, bid: null, justPlaced: false });

  useEffect(() => {
    if (!isFreelancer) return undefined;
    let alive = true;
    setMyBid({ checked: false, bid: null, justPlaced: false });
    api
      .get('/api/bids/mine', { params: { limit: 50 } })
      .then((res) => {
        const found = res.data.bids.find((b) => b.project?._id === project._id) || null;
        if (alive) setMyBid({ checked: true, bid: found, justPlaced: false });
      })
      .catch(() => alive && setMyBid({ checked: true, bid: null, justPlaced: false }));
    return () => {
      alive = false;
    };
  }, [isFreelancer, project._id]);

  // Do not guess before we know who is looking: no flash of the logged-out prompt.
  if (authLoading) return <Spinner label="Checking your login" />;

  if (!user) {
    return (
      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Want to bid on this project?</h2>
        <p className="mt-1 text-sm text-muted">Log in as a freelancer to send your price and a cover letter.</p>
        <div className="mt-4 flex gap-2">
          <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary">Log in</Link>
          <Link to="/register?role=freelancer" className="btn btn-outline">Sign up</Link>
        </div>
      </div>
    );
  }
  if (project.client && user._id === project.client._id) {
    return (
      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">This is your project</h2>
        <p className="mt-1 text-sm text-muted">
          It has {project.bidCount} bid{project.bidCount === 1 ? '' : 's'} so far.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/projects/${project._id}/bids`} className="btn btn-primary">Manage bids ({project.bidCount})</Link>
          {project.status === 'OPEN' && <Link to={`/projects/${project._id}/edit`} className="btn btn-outline">Edit project</Link>}
        </div>
      </div>
    );
  }
  if (!isFreelancer) return <Alert type="info">Only freelancers can bid on projects.</Alert>;
  if (!myBid.checked) return <Spinner label="Checking your bids" />;
  if (myBid.bid) return <BidSummary bid={myBid.bid} justPlaced={myBid.justPlaced} />;
  if (project.status !== 'OPEN') return <Alert type="info">This project is no longer taking bids.</Alert>;

  return (
    <BidForm
      project={project}
      onPlaced={(bid) => {
        setMyBid({ checked: true, bid, justPlaced: true });
        onBidPlaced();
      }}
    />
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, error: '', notFound: false, project: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', notFound: false, project: null });
    api
      .get(`/api/projects/${id}`)
      .then((res) => alive && setState({ loading: false, error: '', notFound: false, project: res.data.project }))
      .catch((err) => {
        if (!alive) return;
        const missing = err.response?.status === 404 || err.response?.status === 400;
        setState({ loading: false, error: missing ? '' : errorMessage(err), notFound: missing, project: null });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.loading) return <Spinner label="Loading project" />;
  if (state.notFound || state.error || !state.project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={state.error ? 'Could not load this project' : 'Project not found'}
          action={<Link to="/projects" className="btn btn-primary">Browse projects</Link>}
        >
          {state.error || 'It may have been removed by the client.'}
        </EmptyState>
      </div>
    );
  }

  const { project } = state;
  const { client } = project;
  const bumpBidCount = () =>
    setState((s) => ({ ...s, project: { ...s.project, bidCount: s.project.bidCount + 1 } }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {location.state?.notice && (
        <div className="mb-5">
          <Alert type="success">{location.state.notice}</Alert>
        </div>
      )}
      <Link to="/projects" className="text-sm font-medium text-peacock-deep hover:underline">Back to all projects</Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <article>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <span className="text-sm text-muted">{project.category}</span>
            <span className="text-sm text-muted">Posted {timeAgo(project.createdAt)}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{project.title}</h1>

          <h2 className="mt-8 text-lg font-semibold">About this project</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line text-ink/90">{project.description}</p>

          <h2 className="mt-8 text-lg font-semibold">Skills needed</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.skills.map((s) => (
              <li key={s} className="chip px-3 py-1 text-sm">{s}</li>
            ))}
          </ul>
        </article>

        <aside className="space-y-5">
          <dl className="space-y-4 rounded-xl border border-line bg-white p-5">
            <div>
              <dt className="text-sm text-muted">Budget</dt>
              <dd className="font-display text-2xl font-semibold">{budgetRange(project.budgetMin, project.budgetMax)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Deadline</dt>
              <dd className="font-medium">{shortDate(project.deadline)}</dd>
              <dd className="text-sm text-muted">{deadlineText(project.deadline)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Bids so far</dt>
              <dd className="font-medium">{project.bidCount}</dd>
            </div>
          </dl>

          <BidArea project={project} onBidPlaced={bumpBidCount} />

          {client && (
            <div className="rounded-xl border border-line bg-white p-5">
              <h2 className="text-sm text-muted">Posted by</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={client.name} src={client.avatar} size="lg" />
                <div>
                  <p className="font-semibold">
                    <Link to={`/profile/${client._id}`} className="hover:text-peacock-deep hover:underline">{client.name}</Link>
                  </p>
                  {client.company && <p className="text-sm text-muted">{client.company}</p>}
                  <Stars value={client.ratingAverage} count={client.ratingCount} />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
