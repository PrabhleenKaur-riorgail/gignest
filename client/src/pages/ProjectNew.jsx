import { useNavigate } from 'react-router-dom';
import api from '../api';
import ProjectForm from '../components/ProjectForm';

export default function ProjectNew() {
  const navigate = useNavigate();

  const create = async (payload) => {
    const { data } = await api.post('/api/projects', payload);
    navigate(`/projects/${data.project._id}`, { state: { notice: 'Your project is live. Freelancers can start bidding now.' } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Post a project</h1>
      <p className="mt-1 text-muted">The clearer your description, the better the bids you will get.</p>
      <div className="mt-6">
        <ProjectForm submitLabel="Post project" onSubmit={create} />
      </div>
    </div>
  );
}
