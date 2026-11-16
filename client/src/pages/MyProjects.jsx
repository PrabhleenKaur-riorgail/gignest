import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { Alert, ConfirmAction, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui';
import { budgetRange, deadlineText, shortDate } from '../utils/format';

const TABS = [
  ['', 'All'],
  ['OPEN', 'Open'],
  ['IN_PROGRESS', 'In progress'],
  ['COMPLETED', 'Completed'],
  ['CLOSED', 'Closed'],
];

export default function MyProjects() {
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
      const res = await api.get('/api/projects/mine', { params: query });
      setState({ loading: false, error: '', data: res.data });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), data: null });
    }
  }, [status, page]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  const act = async (request, message) => {
    setActionError('');
    try {
      await request();
      setNotice(message);
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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My projects</h1>
          <p className="mt-1 text-muted">Everything you have posted, and the bids waiting on each project.</p>
        </div>
        <Link to="/projects/new" className="btn btn-accent">Post a project</Link>
      </div>

      <div role="tablist" aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={label}
            role="tab"
            aria-selected={status === value}
            onClick={() => setTab(value)}
            className={`btn ${status === value ? 'btn-primary' : 'btn-outline'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {notice && <Alert type="success">{notice}</Alert>}
        {actionError && <Alert type="error">{actionError}</Alert>}
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.loading && !data && <Spinner label="Loading your projects" />}

        {data && data.projects.length === 0 && (
          <EmptyState
            title={status ? 'No projects with this status' : 'You have not posted anything yet'}
            action={!status && <Link to="/projects/new" className="btn btn-primary">Post your first project</Link>}
          >
            {status ? 'Try another tab.' : 'Describe what you need and freelancers will send you bids.'}
          </EmptyState>
        )}

        {data?.projects.map((p) => (
          <article key={p._id} className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-sm text-muted">{p.category}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold">
                  <Link to={`/projects/${p._id}`} className="hover:text-peacock-deep hover:underline">{p.title}</Link>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {budgetRange(p.budgetMin, p.budgetMax)}, due {shortDate(p.deadline)} ({deadlineText(p.deadline)})
                </p>
              </div>
              <p className="shrink-0 text-sm sm:text-right">
                <span className="font-display text-2xl font-semibold">{p.bidCount}</span>
                <span className="ml-1 text-muted">bid{p.bidCount === 1 ? '' : 's'}</span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Link to={`/projects/${p._id}/bids`} className="btn btn-primary">
                {p.status === 'OPEN' ? 'View and compare bids' : 'View bids'}
              </Link>
              {(p.status === 'IN_PROGRESS' || p.status === 'COMPLETED') && (
                <Link to="/contracts" className="btn btn-outline">View contract</Link>
              )}
              {p.status === 'OPEN' && (
                <>
                  <Link to={`/projects/${p._id}/edit`} className="btn btn-outline">Edit</Link>
                  <ConfirmAction
                    label="Close"
                    question="Close this project? Waiting bids will be rejected."
                    confirmLabel="Yes, close it"
                    onConfirm={() => act(() => api.patch(`/api/projects/${p._id}/close`), 'The project was closed.')}
                  />
                </>
              )}
              {(p.status === 'OPEN' || p.status === 'CLOSED') && (
                <ConfirmAction
                  label="Delete"
                  question="Delete this project and all its bids for good?"
                  confirmLabel="Yes, delete it"
                  onConfirm={() => act(() => api.delete(`/api/projects/${p._id}`), 'The project was deleted.')}
                />
              )}
            </div>
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
