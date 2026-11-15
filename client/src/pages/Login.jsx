import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-sm text-muted">
        New to GigNest?{' '}
        <Link to="/register" className="font-semibold text-peacock-deep hover:underline">
          Create an account
        </Link>
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-line bg-white p-6" noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <Field id="email" label="Email">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" value={form.email} onChange={update} />
        </Field>
        <Field id="password" label="Password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" value={form.password} onChange={update} />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !form.email || !form.password}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
