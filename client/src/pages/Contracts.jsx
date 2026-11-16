import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui';
import { inr, shortDate } from '../utils/format';

const TABS = [
  ['', 'All'],
  ['ACTIVE', 'Active'],
  ['COMPLETED', 'Completed'],
];

export default function Contracts() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const query = { limit: 8, page };
    if (status) query.status = status;
    api
      .get('/api/contracts', { params: query })
      .then((res) => alive && setState({ loading: false, error: '', data: res.data }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), data: null }));
    return () => {
      alive = false;
    };
  }, [status, page]);

  const setTab = (value) => {
    const next = new URLSearchParams();
    if (value) next.set('status', value);
    setParams(next);
  };

  const { data } = state;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Contracts</h1>
      <p className="mt-1 text-muted">Work that is under way or finished. Open a contract to fund, deliver or approve milestones.</p>

      <div role="tablist" aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button key={label} role="tab" aria-selected={status === value} onClick={() => setTab(value)} className={`btn ${status === value ? 'btn-primary' : 'btn-outline'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.loading && !data && <Spinner label="Loading contracts" />}

        {data && data.contracts.length === 0 && (
          <EmptyState
            title={status ? 'No contracts with this status' : 'No contracts yet'}
            action={
              !status &&
              (user.role === 'client' ? (
                <Link to="/my-projects" className="btn btn-primary">Go to my projects</Link>
              ) : (
                <Link to="/projects" className="btn btn-primary">Find projects to bid on</Link>
              ))
            }
          >
            {status ? 'Try another tab.' : 'A contract starts when a client accepts a bid.'}
          </EmptyState>
        )}

        {data?.contracts.map((c) => {
          const other = user._id === c.client._id ? c.freelancer : c.client;
          const otherRole = user._id === c.client._id ? 'Freelancer' : 'Client';
          return (
            <article key={c._id} className="relative rounded-xl border border-line bg-white p-5 transition-colors hover:border-peacock">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <StatusBadge status={c.status} />
                  <h2 className="mt-2 text-lg font-semibold">
                    <Link to={`/contracts/${c._id}`} className="after:absolute after:inset-0 hover:text-peacock-deep">{c.project?.title || 'Project removed'}</Link>
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <Avatar name={other.name} src={other.avatar} size="sm" />
                    <span>{otherRole}: <span className="font-medium text-ink">{other.name}</span></span>
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="font-display text-2xl font-semibold">{inr(c.totalAmount)}</p>
                  <p className="text-sm text-muted">Due {shortDate(c.dueDate)}</p>
                </div>
              </div>
            </article>
          );
        })}

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
