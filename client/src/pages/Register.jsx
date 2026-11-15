import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

const ROLES = [
  { value: 'client', title: 'I want to hire', text: 'Post projects and pay freelancers milestone by milestone.' },
  { value: 'freelancer', title: 'I want to work', text: 'Bid on projects and get paid when your work is approved.' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: params.get('role') === 'freelancer' ? 'freelancer' : 'client',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter your name (at least 2 characters).';
    if (!EMAIL_REGEX.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < 8) found.password = 'Use at least 8 characters.';
    return found;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        Already have one?{' '}
        <Link to="/login" className="font-semibold text-peacock-deep hover:underline">
          Log in
        </Link>
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-line bg-white p-6" noValidate>
        {serverError && <Alert type="error">{serverError}</Alert>}

        <fieldset>
          <legend className="label">What brings you to GigNest?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer rounded-lg border p-4 ${form.role === r.value ? 'border-peacock bg-peacock-soft' : 'border-line bg-white hover:border-peacock'}`}
              >
                <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={update} className="sr-only" />
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="mt-1 block text-xs text-muted">{r.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="name" label="Full name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" className="input" value={form.name} onChange={update} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="input" value={form.email} onChange={update} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
        </Field>
        <Field id="password" label="Password" hint="At least 8 characters." error={errors.password}>
          <input id="password" name="password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={update} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
        </Field>

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
