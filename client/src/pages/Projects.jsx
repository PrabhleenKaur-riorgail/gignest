import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import ProjectCard from '../components/ProjectCard';
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui';
import { CATEGORIES, SORT_OPTIONS } from '../utils/constants';

const FILTER_KEYS = ['q', 'category', 'skills', 'minBudget', 'maxBudget', 'sort'];
const PAGE_SIZE = 8;

const readFilters = (params) => ({
  q: params.get('q') || '',
  category: params.get('category') || '',
  skills: params.get('skills') || '',
  minBudget: params.get('minBudget') || '',
  maxBudget: params.get('maxBudget') || '',
  sort: params.get('sort') || 'newest',
});

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [form, setForm] = useState(() => readFilters(params));
  const [state, setState] = useState({ loading: true, error: '', data: null });

  // Keep the form in step with the address bar (for example after "Clear" or the back button).
  useEffect(() => {
    setForm(readFilters(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // Load the projects whenever the address bar changes.
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));

    const query = { limit: PAGE_SIZE, page };
    const filters = readFilters(params);
    for (const key of FILTER_KEYS) if (filters[key]) query[key] = filters[key];

    api
      .get('/api/projects', { params: query })
      .then((res) => alive && setState({ loading: false, error: '', data: res.data }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const apply = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = String(form[key]).trim();
      if (value && !(key === 'sort' && value === 'newest')) next.set(key, value);
    }
    setParams(next);
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
    window.scrollTo?.({ top: 0 });
  };

  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && params.get(k));
  const { data } = state;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Browse projects</h1>
      <p className="mt-1 text-muted">Open projects that are taking bids right now.</p>

      <form onSubmit={apply} className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5" role="search">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">Search projects</label>
            <input id="q" name="q" type="search" className="input" placeholder="Search by title, description or skill" value={form.q} onChange={update} />
          </div>
          <button type="submit" className="btn btn-primary sm:w-32">Search</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" name="category" className="input" value={form.category} onChange={update}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="skills" className="label">Skills</label>
            <input id="skills" name="skills" className="input" placeholder="react, node.js" value={form.skills} onChange={update} />
          </div>
          <div>
            <label htmlFor="minBudget" className="label">Budget from (₹)</label>
            <input id="minBudget" name="minBudget" type="number" min="0" className="input" value={form.minBudget} onChange={update} />
          </div>
          <div>
            <label htmlFor="maxBudget" className="label">Budget up to (₹)</label>
            <input id="maxBudget" name="maxBudget" type="number" min="0" className="input" value={form.maxBudget} onChange={update} />
          </div>
          <div>
            <label htmlFor="sort" className="label">Sort by</label>
            <select id="sort" name="sort" className="input" value={form.sort} onChange={update}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <button type="button" className="mt-4 text-sm font-semibold text-peacock-deep hover:underline" onClick={() => setParams(new URLSearchParams())}>
            Clear all filters
          </button>
        )}
      </form>

      <div className="mt-8" aria-live="polite">
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.loading && !data && <Spinner label="Loading projects" />}

        {data && (
          <>
            <p className="mb-4 text-sm text-muted">
              {data.total} open project{data.total === 1 ? '' : 's'}
              {hasFilters ? ' match your filters' : ''}
            </p>
            {data.projects.length ? (
              <div className={`space-y-4 ${state.loading ? 'opacity-60' : ''}`}>
                {data.projects.map((p) => (
                  <ProjectCard key={p._id} project={p} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={hasFilters ? 'No projects match these filters' : 'No open projects yet'}
                action={
                  hasFilters ? (
                    <button className="btn btn-outline" onClick={() => setParams(new URLSearchParams())}>Clear all filters</button>
                  ) : (
                    <Link to="/register?role=client" className="btn btn-primary">Post a project</Link>
                  )
                }
              >
                {hasFilters ? 'Try a different keyword, or widen the budget range.' : 'New projects appear here as soon as clients post them.'}
              </EmptyState>
            )}
            <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </div>
  );
}
