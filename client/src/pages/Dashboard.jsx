import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner, Stars } from '../components/ui';
import { inr, monthLabel } from '../utils/format';

const ENDPOINTS = {
  client: '/api/dashboard/client',
  freelancer: '/api/dashboard/freelancer',
  admin: '/api/admin/stats',
};

function Stat({ label, value, hint, highlight = false }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'border-marigold bg-marigold-soft' : 'border-line bg-white'}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

// Six small bars, one per month. Plain HTML so it stays light and readable.
function MonthBars({ title, data, format = inr }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted">{format(total)} in total</p>
      </div>
      <ul className="mt-6 grid grid-cols-6 gap-3">
        {data.map((d) => (
          <li key={d.month} className="flex flex-col items-center gap-2">
            <span className="h-4 text-xs text-muted">{d.amount ? format(d.amount) : ''}</span>
            <div className="flex h-28 w-full items-end">
              <div
                className="w-full rounded-t bg-peacock"
                style={{ height: `${d.amount ? Math.max(4, Math.round((d.amount / max) * 112)) : 2}px`, opacity: d.amount ? 1 : 0.25 }}
              />
            </div>
            <span className="text-xs font-medium">{monthLabel(d.month)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClientView({ data }) {
  const { stats } = data;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Projects posted" value={stats.totalProjects} hint={`${stats.projectsByStatus.OPEN} open now`} />
        <Stat label="Bids waiting for you" value={stats.pendingBidsToReview} highlight={stats.pendingBidsToReview > 0} />
        <Stat label="Active contracts" value={stats.activeContracts} hint={`${stats.completedContracts} completed`} />
        <Stat label="Total spent" value={inr(stats.totalSpent)} />
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Your rating</p>
          <div className="mt-2"><Stars value={stats.ratingAverage} count={stats.ratingCount} /></div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <MonthBars title="Money you funded, last 6 months" data={data.spendingByMonth} />
        <section className="rounded-xl border border-line bg-white p-5">
          <h3 className="font-semibold">Your projects by category</h3>
          {data.projectsByCategory.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {data.projectsByCategory.map((c) => (
                <li key={c.category} className="flex justify-between border-b border-line pb-2 last:border-0">
                  <span>{c.category}</span>
                  <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Nothing yet. Your categories show up here after you post a project.</p>
          )}
        </section>
      </div>
    </>
  );
}

function FreelancerView({ data }) {
  const { stats } = data;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Wallet balance" value={inr(stats.walletBalance)} highlight hint="Money released to you so far" />
        <Stat label="Total earned" value={inr(stats.totalEarned)} hint={`${inr(stats.feesPaid)} paid in platform fees`} />
        <Stat label="Active contracts" value={stats.activeContracts} hint={`${stats.completedContracts} completed`} />
        <Stat label="Bids sent" value={stats.totalBids} hint={`${stats.pendingBids} waiting for an answer`} />
        <Stat
          label="Bid success rate"
          value={stats.bidSuccessRate === null ? 'None yet' : `${stats.bidSuccessRate}%`}
          hint="Accepted bids out of all answered bids"
        />
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Your rating</p>
          <div className="mt-2"><Stars value={stats.ratingAverage} count={stats.ratingCount} /></div>
        </div>
      </div>
      <div className="mt-6">
        <MonthBars title="Money released to you, last 6 months" data={data.earningsByMonth} />
      </div>
    </>
  );
}

function AdminView({ data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users.total} hint={`${data.users.clients} clients, ${data.users.freelancers} freelancers`} />
        <Stat label="Projects" value={data.projects.total} hint={`${data.projects.byStatus.OPEN} open`} />
        <Stat label="Contracts" value={data.contracts.total} hint={`${data.contracts.byStatus.ACTIVE} active`} />
        <Stat label="Open reports" value={data.openReports} highlight={data.openReports > 0} />
        <Stat label="Money funded" value={inr(data.money.totalFunded)} />
        <Stat label="Paid out" value={inr(data.money.totalPaidOut)} />
        <Stat label="Commission earned" value={inr(data.money.commissionEarned)} />
        <Stat label="Blocked users" value={data.users.blocked} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <MonthBars title="Money funded, last 6 months" data={data.volumeByMonth.map((m) => ({ month: m.month, amount: m.funded }))} />
        <MonthBars title="Commission earned, last 6 months" data={data.volumeByMonth.map((m) => ({ month: m.month, amount: m.commission }))} />
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', data: null });
    api
      .get(ENDPOINTS[user.role])
      .then((res) => alive && setState({ loading: false, error: '', data: res.data }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), data: null }));
    return () => {
      alive = false;
    };
  }, [user.role]);

  const firstName = user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {firstName}</h1>
          <p className="mt-1 text-muted">
            {user.role === 'client' && 'Here is how your projects and spending look.'}
            {user.role === 'freelancer' && 'Here is how your bids and earnings look.'}
            {user.role === 'admin' && 'Here is how the whole platform is doing.'}
          </p>
        </div>
        <Link to="/projects" className="btn btn-outline">Browse projects</Link>
      </div>

      <div className="mt-8">
        {state.loading && <Spinner label="Loading your dashboard" />}
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.data && user.role === 'client' && <ClientView data={state.data} />}
        {state.data && user.role === 'freelancer' && <FreelancerView data={state.data} />}
        {state.data && user.role === 'admin' && <AdminView data={state.data} />}
      </div>
    </div>
  );
}
