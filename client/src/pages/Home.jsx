import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import MilestoneTrack from '../components/MilestoneTrack';
import ProjectCard from '../components/ProjectCard';
import { EmptyState, Spinner } from '../components/ui';
import { CATEGORIES } from '../utils/constants';

const steps = [
  ['Post a project', 'Describe the work, set a budget range and a deadline.'],
  ['Compare bids', 'Freelancers send a price, a timeline and a cover letter. You can see their ratings.'],
  ['Fund a milestone', 'Pay for the first milestone. The freelancer starts work knowing the money is there.'],
  ['Approve and release', 'When you approve the delivery, the payment moves to the freelancer. Then you both leave a review.'],
];

export default function Home() {
  const [latest, setLatest] = useState({ loading: true, projects: [] });

  useEffect(() => {
    let alive = true;
    api
      .get('/api/projects', { params: { limit: 4 } })
      .then((res) => alive && setLatest({ loading: false, projects: res.data.projects }))
      .catch(() => alive && setLatest({ loading: false, projects: [] }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <h1 className="text-balance text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
            Hire for the job. Pay as each part gets done.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            On GigNest a client funds one milestone at a time, and the freelancer is paid when the
            work is approved. Nobody pays everything upfront, and nobody works without knowing the
            money is there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register?role=client" className="btn btn-accent px-5 py-3 text-base">
              Post a project
            </Link>
            <Link to="/projects" className="btn btn-outline px-5 py-3 text-base">
              Browse open projects
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">Free to join. Built for students and early-career freelancers.</p>
        </div>
        <MilestoneTrack />
      </section>

      {/* How it works: a real sequence */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">How a project runs</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, text], i) => (
              <li key={title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peacock font-display text-base font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Find work by category</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <Link
                to={`/projects?category=${encodeURIComponent(c)}`}
                className="block rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium hover:border-peacock hover:text-peacock-deep"
              >
                {c}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Latest projects */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Open right now</h2>
          <Link to="/projects" className="text-sm font-semibold text-peacock-deep hover:underline">
            See all projects
          </Link>
        </div>
        <div className="mt-6 space-y-4">
          {latest.loading ? (
            <Spinner label="Loading projects" />
          ) : latest.projects.length ? (
            latest.projects.map((p) => <ProjectCard key={p._id} project={p} />)
          ) : (
            <EmptyState
              title="No open projects yet"
              action={<Link to="/register?role=client" className="btn btn-primary">Post the first project</Link>}
            >
              New projects appear here as soon as a client posts them.
            </EmptyState>
          )}
        </div>
      </section>

      {/* Two audiences */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-px overflow-hidden rounded-2xl bg-peacock-deep md:grid-cols-2">
          <div className="bg-ink p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-white">Need something built?</h2>
            <p className="mt-2 max-w-sm text-sm text-white/75">
              Post a project, compare bids from freelancers, and pay only for work you have approved.
            </p>
            <Link to="/register?role=client" className="btn btn-accent mt-6">Create a client account</Link>
          </div>
          <div className="bg-peacock-deep p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-white">Looking for work?</h2>
            <p className="mt-2 max-w-sm text-sm text-white/75">
              Build a profile, bid on projects that match your skills, and get paid for every milestone.
            </p>
            <Link to="/register?role=freelancer" className="btn btn-accent mt-6">Create a freelancer account</Link>
          </div>
        </div>
      </section>
    </>
  );
}
