import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import ProjectForm from '../components/ProjectForm';
import { Alert, EmptyState, Spinner } from '../components/ui';

export default function ProjectEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', project: null });

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/projects/${id}`)
      .then((res) => alive && setState({ loading: false, error: '', project: res.data.project }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), project: null }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.loading) return <Spinner label="Loading project" />;
  if (state.error || !state.project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Project not found" action={<Link to="/my-projects" className="btn btn-primary">Back to my projects</Link>}>
          It may have been removed.
        </EmptyState>
      </div>
    );
  }

  const { project } = state;
  const blocked =
    project.client._id !== user._id
      ? 'You can only edit your own projects.'
      : project.status !== 'OPEN'
        ? 'Only open projects can be edited. This one is no longer open.'
        : '';

  const save = async (payload) => {
    await api.put(`/api/projects/${id}`, payload);
    navigate(`/projects/${id}`, { state: { notice: 'Your changes were saved.' } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Edit project</h1>
      <div className="mt-6">
        {blocked ? (
          <>
            <Alert type="info">{blocked}</Alert>
            <Link to={`/projects/${id}`} className="btn btn-outline mt-4">Back to the project</Link>
          </>
        ) : (
          <ProjectForm initial={project} submitLabel="Save changes" onSubmit={save} />
        )}
      </div>
    </div>
  );
}
