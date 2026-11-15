import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <EmptyState
        title="This page does not exist"
        action={<Link to="/" className="btn btn-primary">Go to the home page</Link>}
      >
        The link may be broken, or the page may have been removed.
      </EmptyState>
    </div>
  );
}
