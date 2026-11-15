import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';
import { parseSkills } from '../components/ProjectForm';

const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function ProfileEdit() {
  const { user, updateUser } = useAuth();
  const isFreelancer = user.role === 'freelancer';
  const isClient = user.role === 'client';

  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    avatar: user.avatar || '',
    skills: (user.skills || []).join(', '),
    hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
    portfolioLinks: (user.portfolioLinks || []).join('\n'),
    company: user.company || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSaved(false);

    const found = {};
    const links = form.portfolioLinks.split('\n').map((l) => l.trim()).filter(Boolean);
    const skills = parseSkills(form.skills);
    const rate = form.hourlyRate === '' ? 0 : Number(form.hourlyRate);

    if (form.name.trim().length < 2 || form.name.trim().length > 60) found.name = 'Your name should be 2 to 60 characters.';
    if (form.bio.length > 1000) found.bio = 'Keep the bio under 1000 characters.';
    if (form.avatar.trim() && !isHttpUrl(form.avatar.trim())) found.avatar = 'Enter a full web link starting with http:// or https://';
    if (isFreelancer) {
      if (skills.length > 20) found.skills = 'Add at most 20 skills.';
      if (Number.isNaN(rate) || rate < 0 || rate > 100000) found.hourlyRate = 'Enter your hourly rate in rupees.';
      if (links.length > 10) found.portfolioLinks = 'Add at most 10 links.';
      else if (links.some((l) => !isHttpUrl(l))) found.portfolioLinks = 'Every portfolio link must start with http:// or https://';
    }
    if (isClient && form.company.length > 100) found.company = 'Keep the company name under 100 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = { name: form.name.trim(), bio: form.bio.trim(), avatar: form.avatar.trim() };
    if (isFreelancer) Object.assign(payload, { skills, hourlyRate: rate, portfolioLinks: links });
    if (isClient) payload.company = form.company.trim();

    setBusy(true);
    try {
      const { data } = await api.put('/api/users/me', payload);
      updateUser(data.user);
      setSaved(true);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const invalid = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Edit your profile</h1>
      <p className="mt-1 text-muted">This is what other people see on your public profile.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5 rounded-xl border border-line bg-white p-5 sm:p-7">
        {saved && (
          <Alert type="success">
            Profile saved. <Link to={`/profile/${user._id}`} className="font-semibold underline">View your public profile</Link>
          </Alert>
        )}
        {serverError && <Alert type="error">{serverError}</Alert>}

        <Field id="name" label="Full name" error={errors.name}>
          <input id="name" name="name" className="input" value={form.name} onChange={update} {...invalid('name')} />
        </Field>
        <Field id="bio" label="About you" hint={`${form.bio.length}/1000 characters`} error={errors.bio}>
          <textarea id="bio" name="bio" rows={5} maxLength={1000} className="input" value={form.bio} onChange={update} {...invalid('bio')} />
        </Field>
        <Field id="avatar" label="Profile picture link (optional)" hint="A web link to an image. Picture uploads arrive in a later update." error={errors.avatar}>
          <input id="avatar" name="avatar" className="input" value={form.avatar} onChange={update} {...invalid('avatar')} />
        </Field>

        {isFreelancer && (
          <>
            <Field id="skills" label="Your skills" hint="Separate with commas, for example: react, node.js, figma" error={errors.skills}>
              <input id="skills" name="skills" className="input" value={form.skills} onChange={update} {...invalid('skills')} />
            </Field>
            <Field id="hourlyRate" label="Hourly rate (₹)" error={errors.hourlyRate}>
              <input id="hourlyRate" name="hourlyRate" type="number" min="0" className="input" value={form.hourlyRate} onChange={update} {...invalid('hourlyRate')} />
            </Field>
            <Field id="portfolioLinks" label="Portfolio links" hint="One link per line, for example your GitHub or a live project." error={errors.portfolioLinks}>
              <textarea id="portfolioLinks" name="portfolioLinks" rows={3} className="input" value={form.portfolioLinks} onChange={update} {...invalid('portfolioLinks')} />
            </Field>
          </>
        )}

        {isClient && (
          <Field id="company" label="Company or organisation (optional)" error={errors.company}>
            <input id="company" name="company" className="input" value={form.company} onChange={update} {...invalid('company')} />
          </Field>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
