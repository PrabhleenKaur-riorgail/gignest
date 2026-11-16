import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { Alert, Avatar, ConfirmAction, EmptyState, Spinner, Stars, StatusBadge } from '../components/ui';
import { budgetRange, inr, timeAgo } from '../utils/format';

const SORTS = [
  ['newest', 'Newest first'],
  ['price_low', 'Lowest price'],
  ['price_high', 'Highest price'],
  ['fastest', 'Fastest delivery'],
  ['rating', 'Best rated'],
];

function BidCard({ bid, canDecide, onAccept, onReject }) {
  const f = bid.freelancer;
  return (
    <article className={`rounded-xl border bg-white p-5 sm:p-6 ${bid.status === 'ACCEPTED' ? 'border-peacock ring-1 ring-peacock' : 'border-line'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Avatar name={f.name} src={f.avatar} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              <Link to={`/profile/${f._id}`} className="hover:text-peacock-deep hover:underline">{f.name}</Link>
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars value={f.ratingAverage} count={f.ratingCount} />
              {f.hourlyRate > 0 && <span className="text-sm text-muted">{inr(f.hourlyRate)} per hour</span>}
            </div>
            {f.skills?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Skills of ${f.name}`}>
                {f.skills.slice(0, 6).map((s) => (
                  <li key={s} className="chip">{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <StatusBadge status={bid.status} />
          <p className="mt-2 font-display text-2xl font-semibold">{inr(bid.amount)}</p>
          <p className="text-sm text-muted">in {bid.deliveryDays} day{bid.deliveryDays === 1 ? '' : 's'}</p>
          <p className="text-xs text-muted">Sent {timeAgo(bid.createdAt)}</p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm">{bid.coverLetter}</p>

      {bid.milestones?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Proposed payment plan</h3>
          <table className="mt-2 w-full text-left text-sm">
            <caption className="sr-only">Milestones proposed by {f.name}</caption>
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Milestone</th>
                <th className="py-1 pr-3 font-medium">Due after</th>
                <th className="py-1 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bid.milestones.map((m, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 pr-3">{m.title}</td>
                  <td className="py-1.5 pr-3">{m.dueDays} day{m.dueDays === 1 ? '' : 's'}</td>
                  <td className="py-1.5 text-right">{inr(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canDecide && bid.status === 'PENDING' && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <ConfirmAction
            tone="primary"
            label="Accept this bid"
            question={`Hire ${f.name} for ${inr(bid.amount)}? Every other bid will be rejected.`}
            confirmLabel="Yes, hire them"
            onConfirm={() => onAccept(bid)}
          />
          <ConfirmAction
            label="Reject"
            question="Reject this bid?"
            confirmLabel="Yes, reject"
            onConfirm={() => onReject(bid)}
          />
        </div>
      )}
    </article>
  );
}

export default function ProjectBids() {
  const { id } = useParams();
  const [sort, setSort] = useState('newest');
  const [state, setState] = useState({ loading: true, error: '', project: null, bids: [] });
  const [notice, setNotice] = useState('');
  const [contractId, setContractId] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get(`/api/projects/${id}/bids`, { params: { sort } }),
      ]);
      setState({ loading: false, error: '', project: p.data.project, bids: b.data.bids });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), project: null, bids: [] });
    }
  }, [id, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (bid) => {
    setActionError('');
    try {
      const { data } = await api.patch(`/api/bids/${bid._id}/accept`);
      setContractId(data.contract._id);
      setNotice(
        `Contract started with ${bid.freelancer.name} for ${inr(data.contract.totalAmount)}, split into ${data.milestones.length} milestone${data.milestones.length === 1 ? '' : 's'}.`
      );
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const reject = async (bid) => {
    setActionError('');
    try {
      await api.patch(`/api/bids/${bid._id}/reject`);
      setNotice('The bid was rejected.');
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  if (state.loading) return <Spinner label="Loading bids" />;
  if (state.error || !state.project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="You cannot view these bids" action={<Link to="/my-projects" className="btn btn-primary">Back to my projects</Link>}>
          {state.error}
        </EmptyState>
      </div>
    );
  }

  const { project, bids } = state;
  const open = project.status === 'OPEN';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/my-projects" className="text-sm font-medium text-peacock-deep hover:underline">Back to my projects</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={project.status} />
        <p className="text-sm text-muted">Budget {budgetRange(project.budgetMin, project.budgetMax)}</p>
      </div>
      <h1 className="mt-2 text-3xl font-bold">
        Bids for <Link to={`/projects/${project._id}`} className="hover:text-peacock-deep hover:underline">{project.title}</Link>
      </h1>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <p className="text-muted">{bids.length} bid{bids.length === 1 ? '' : 's'}</p>
        <div>
          <label htmlFor="sort" className="label">Sort by</label>
          <select id="sort" className="input w-52" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 space-y-4" aria-live="polite">
        {notice && (
          <Alert type="success">
            {notice}{' '}
            {contractId && <Link to={`/contracts/${contractId}`} className="font-semibold underline">Open the contract</Link>}
          </Alert>
        )}
        {actionError && <Alert type="error">{actionError}</Alert>}
        {!open && !notice && <Alert type="info">This project is no longer open, so bids can no longer be accepted or rejected.</Alert>}

        {bids.length === 0 ? (
          <EmptyState title="No bids yet">Freelancers will appear here as soon as they send a bid. You will see their price, timeline and rating.</EmptyState>
        ) : (
          bids.map((bid) => <BidCard key={bid._id} bid={bid} canDecide={open} onAccept={accept} onReject={reject} />)
        )}
      </div>
    </div>
  );
}
