import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { EmptyState, Spinner } from '../components/ui';

// /chat/contract/:id finds (or creates) the chat for a contract and opens it.
export default function ChatByContract() {
  const { contractId } = useParams();
  const [state, setState] = useState({ id: null, error: '' });

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/conversations/by-contract/${contractId}`)
      .then((res) => alive && setState({ id: res.data.conversation._id, error: '' }))
      .catch((err) => alive && setState({ id: null, error: errorMessage(err) }));
    return () => {
      alive = false;
    };
  }, [contractId]);

  if (state.id) return <Navigate to={`/chat/${state.id}`} replace />;
  if (state.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Cannot open this chat" action={<Link to="/contracts" className="btn btn-primary">Back to contracts</Link>}>
          {state.error}
        </EmptyState>
      </div>
    );
  }
  return <Spinner label="Opening the chat" />;
}
