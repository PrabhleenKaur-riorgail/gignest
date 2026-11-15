import { inr } from '../utils/format';

// A sample contract shown on the home page. It explains the product: money moves one milestone at a time.
const steps = [
  { name: 'Design', amount: 4000, state: 'Paid out', status: 'done' },
  { name: 'Build', amount: 6000, state: 'Work submitted', status: 'current' },
  { name: 'Launch', amount: 2000, state: 'Not funded yet', status: 'later' },
];

function Node({ status }) {
  if (status === 'done') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-peacock text-white">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      </span>
    );
  }
  if (status === 'current') {
    return <span className="h-8 w-8 rounded-full border-[6px] border-marigold-soft bg-marigold ring-2 ring-marigold" />;
  }
  return <span className="h-8 w-8 rounded-full border-2 border-line bg-white" />;
}

export default function MilestoneTrack() {
  return (
    <figure
      aria-label="Sample contract with three milestones"
      className="rounded-2xl border border-line bg-white p-5 shadow-[0_28px_60px_-30px_rgba(15,42,48,0.4)] sm:p-7"
    >
      <figcaption className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Sample contract</p>
          <p className="font-display text-xl font-semibold">Landing page redesign</p>
        </div>
        <p className="font-display text-xl font-semibold">{inr(12000)}</p>
      </figcaption>

      <div className="relative mt-9">
        <div className="absolute left-[16.66%] right-[16.66%] top-[14px] h-1 rounded bg-line" aria-hidden="true">
          <div className="track-fill h-full rounded bg-marigold" />
        </div>
        <ol className="relative grid grid-cols-3 gap-2 text-center">
          {steps.map((s) => (
            <li key={s.name} className="flex flex-col items-center">
              <Node status={s.status} />
              <p className="mt-3 text-sm font-semibold">{s.name}</p>
              <p className="text-sm">{inr(s.amount)}</p>
              <p className={`mt-0.5 text-xs ${s.status === 'current' ? 'font-semibold text-amber-800' : 'text-muted'}`}>{s.state}</p>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-7 border-t border-line pt-4 text-sm text-muted">
        The client approves each delivery. The freelancer receives that milestone minus a 5% platform fee.
      </p>
    </figure>
  );
}
