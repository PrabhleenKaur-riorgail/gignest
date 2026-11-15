import { Link } from 'react-router-dom';
import { Avatar, Stars } from './ui';
import { budgetRange, deadlineText, timeAgo } from '../utils/format';

export default function ProjectCard({ project }) {
  const { client } = project;
  return (
    <article className="relative rounded-xl border border-line bg-white p-5 transition-colors hover:border-peacock sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{project.category}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            <Link to={`/projects/${project._id}`} className="after:absolute after:inset-0 hover:text-peacock-deep">
              {project.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{project.description}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
            {project.skills.slice(0, 5).map((skill) => (
              <li key={skill} className="chip">
                {skill}
              </li>
            ))}
            {project.skills.length > 5 && <li className="chip">+{project.skills.length - 5}</li>}
          </ul>
        </div>

        <div className="shrink-0 sm:w-48 sm:text-right">
          <p className="font-display text-lg font-semibold">{budgetRange(project.budgetMin, project.budgetMax)}</p>
          <p className="text-sm text-muted">{deadlineText(project.deadline)}</p>
          <p className="mt-1 text-sm text-muted">
            {project.bidCount} bid{project.bidCount === 1 ? '' : 's'} so far
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <Avatar name={client?.name || '?'} src={client?.avatar} size="sm" />
        {client && (
          <Link to={`/profile/${client._id}`} className="relative z-10 text-sm font-medium hover:text-peacock-deep hover:underline">
            {client.name}
          </Link>
        )}
        <Stars value={client?.ratingAverage} count={client?.ratingCount} />
        <span className="ml-auto text-xs text-muted">Posted {timeAgo(project.createdAt)}</span>
      </div>
    </article>
  );
}
