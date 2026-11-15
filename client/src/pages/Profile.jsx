import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, EmptyState, Pagination, RatingGiven, Spinner, Stars } from '../components/ui';
import { inr, shortDate } from '../utils/format';

function ReviewList({ userId }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api
      .get(`/api/users/${userId}/reviews`, { params: { limit: 5, page } })
      .then((res) => alive && setState({ loading: false, error: '', data: res.data }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), data: null }));
    return () => {
      alive = false;
    };
  }, [userId, page]);

  if (state.error) return <Alert type="error">{state.error}</Alert>;
  if (!state.data) return <Spinner label="Loading reviews" />;
  const { reviews, totalPages } = state.data;

  if (reviews.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted">No reviews yet. Reviews appear here after a contract is completed.</p>;
  }

  return (
    <>
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r._id} className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <RatingGiven value={r.rating} />
              <span className="text-xs text-muted">{shortDate(r.createdAt)}</span>
            </div>
            {r.comment && <p className="mt-2 whitespace-pre-line text-sm">{r.comment}</p>}
            <p className="mt-3 text-xs text-muted">
              From{' '}
              <Link to={`/profile/${r.reviewer._id}`} className="font-medium text-ink hover:underline">{r.reviewer.name}</Link>
              {r.projectTitle && <> for "{r.projectTitle}"</>}
            </p>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', notFound: false, profile: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', notFound: false, profile: null });
    api
      .get(`/api/users/${id}`)
      .then((res) => alive && setState({ loading: false, error: '', notFound: false, profile: res.data.user }))
      .catch((err) => {
        if (!alive) return;
        const missing = err.response?.status === 404 || err.response?.status === 400;
        setState({ loading: false, error: missing ? '' : errorMessage(err), notFound: missing, profile: null });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.loading) return <Spinner label="Loading profile" />;
  if (state.notFound || state.error || !state.profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title={state.error ? 'Could not load this profile' : 'User not found'} action={<Link to="/projects" className="btn btn-primary">Browse projects</Link>}>
          {state.error || 'This profile does not exist, or the account is no longer active.'}
        </EmptyState>
      </div>
    );
  }

  const p = state.profile;
  const isMe = me?._id === p._id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="flex flex-col gap-5 rounded-xl border border-line bg-white p-6 sm:flex-row sm:items-start">
        <Avatar name={p.name} src={p.avatar} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{p.name}</h1>
            <span className="chip capitalize">{p.role}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stars value={p.ratingAverage} count={p.ratingCount} />
            <span className="text-sm text-muted">Member since {shortDate(p.createdAt)}</span>
            {p.role === 'freelancer' && p.hourlyRate > 0 && <span className="text-sm font-medium">{inr(p.hourlyRate)} per hour</span>}
            {p.role === 'client' && p.company && <span className="text-sm font-medium">{p.company}</span>}
          </div>
          {p.bio ? <p className="mt-4 max-w-prose whitespace-pre-line">{p.bio}</p> : <p className="mt-4 text-sm text-muted">{isMe ? 'Add a short bio so people know who you are.' : 'This person has not written a bio yet.'}</p>}
          {isMe && <Link to="/settings/profile" className="btn btn-outline mt-5">Edit profile</Link>}
        </div>
      </section>

      {p.role === 'freelancer' && (
        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg font-semibold">Skills</h2>
            {p.skills.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <li key={s} className="chip px-3 py-1 text-sm">{s}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No skills listed yet.</p>
            )}
          </div>
          <div className="rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg font-semibold">Portfolio</h2>
            {p.portfolioLinks.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {p.portfolioLinks.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-peacock-deep hover:underline">{l}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No portfolio links yet.</p>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
        <ReviewList userId={p._id} />
      </section>
    </div>
  );
}
