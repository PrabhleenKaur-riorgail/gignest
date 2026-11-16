import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { Alert, ConfirmAction, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui';
import { inr, shortDate } from '../utils/format';

const TABS = [
  ['', 'All'],
  ['PENDING', 'Pending'],
  ['ACCEPTED', 'Accepted'],
  ['REJECTED', 'Rejected'],
  ['WITHDRAWN', 'Withdrawn'],
];

export default function MyBids() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const query = { limit: 8, page };
      if (status) query.status = status;
      const res = await api.get('/api/bids/mine', { params: query });
      setState({ loading: false, error: '', data: res.data });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), data: null });
    }
  }, [status, page]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  const withdraw = async (bid) => {
    setActionError('');
    try {
      await api.patch(`/api/bids/${bid._id}/withdraw`);
      setNotice('Your bid was withdrawn.');
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const setTab = (value) => {
    const next = new URLSearchParams();
    if (value) next.set('status', value);
    setParams(next);
    setNotice('');
  };

  const { data } = state;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My bids</h1>
          <p className="mt-1 text-muted">Every proposal you have sent, and what the client decided.</p>
        </div>
        <Link to="/projects" className="btn btn-accent">Find projects to bid on</Link>
      </div>

      <div role="tablist" aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button key={label} role="tab" aria-selected={status === value} onClick={() => setTab(value)} className={`btn ${status === value ? 'btn-primary' : 'btn-outline'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {notice && <Alert type="success">{notice}</Alert>}
        {actionError && <Alert type="error">{actionError}</Alert>}
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.loading && !data && <Spinner label="Loading your bids" />}

        {data && data.bids.length === 0 && (
          <EmptyState
            title={status ? 'No bids with this status' : 'You have not sent any bids yet'}
            action={!status && <Link to="/projects" className="btn btn-primary">Browse projects</Link>}
          >
            {status ? 'Try another tab.' : 'Find a project that matches your skills and send your first bid.'}
          </EmptyState>
        )}

        {data?.bids.map((bid) => (
          <article key={bid._id} className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={bid.status} />
                  {bid.project && <span className="text-sm text-muted">Project is {bid.project.status.replace('_', ' ').toLowerCase()}</span>}
                </div>
                <h2 className="mt-2 text-lg font-semibold">
                  {bid.project ? (
                    <Link to={`/projects/${bid.project._id}`} className="hover:text-peacock-deep hover:underline">{bid.project.title}</Link>
                  ) : (
                    'This project was removed'
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted">Sent on {shortDate(bid.createdAt)}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="font-display text-2xl font-semibold">{inr(bid.amount)}</p>
                <p className="text-sm text-muted">in {bid.deliveryDays} day{bid.deliveryDays === 1 ? '' : 's'}</p>
              </div>
            </div>
            {bid.status === 'ACCEPTED' && (
              <div className="mt-4 border-t border-line pt-4">
                <Link to="/contracts" className="btn btn-primary">Open your contract</Link>
              </div>
            )}
            {bid.status === 'PENDING' && (
              <div className="mt-4 border-t border-line pt-4">
                <ConfirmAction label="Withdraw bid" question="Withdraw this bid?" confirmLabel="Yes, withdraw" onConfirm={() => withdraw(bid)} />
              </div>
            )}
          </article>
        ))}

        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
