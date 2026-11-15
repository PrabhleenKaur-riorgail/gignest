import { useState } from 'react';
import { errorMessage } from '../api';
import { Alert, Field } from './ui';
import { CATEGORIES } from '../utils/constants';

const pad = (n) => String(n).padStart(2, '0');
// Turns a date into "YYYY-MM-DD" in the person's own time zone (what a date input expects).
export const toDateInput = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "React, node.js, react" becomes ["react", "node.js"]
export const parseSkills = (text) => [
  ...new Set(
    text
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  ),
];

// The form for posting a new project and for editing an existing one.
export default function ProjectForm({ initial, submitLabel, onSubmit }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    skills: (initial?.skills ?? []).join(', '),
    budgetMin: initial ? String(initial.budgetMin) : '',
    budgetMax: initial ? String(initial.budgetMax) : '',
    deadline: initial ? toDateInput(initial.deadline) : '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const skills = parseSkills(form.skills);

  const validate = () => {
    const found = {};
    const min = Number(form.budgetMin);
    const max = Number(form.budgetMax);
    if (form.title.trim().length < 5 || form.title.trim().length > 120) found.title = 'The title should be 5 to 120 characters.';
    if (form.description.trim().length < 20) found.description = 'Describe the work in at least 20 characters.';
    if (!CATEGORIES.includes(form.category)) found.category = 'Choose a category.';
    if (skills.length < 1) found.skills = 'Add at least one skill, separated by commas.';
    else if (skills.length > 15) found.skills = 'Add at most 15 skills.';
    else if (skills.some((s) => s.length > 30)) found.skills = 'Each skill can be at most 30 characters.';
    if (form.budgetMin === '' || Number.isNaN(min) || min < 0) found.budgetMin = 'Enter the lowest budget in rupees.';
    if (form.budgetMax === '' || Number.isNaN(max) || max < 0) found.budgetMax = 'Enter the highest budget in rupees.';
    else if (!found.budgetMin && max < min) found.budgetMax = 'The highest budget cannot be lower than the lowest.';
    if (!form.deadline) found.deadline = 'Choose a deadline.';
    else if (new Date(`${form.deadline}T23:59:00`).getTime() <= Date.now()) found.deadline = 'The deadline must be a future date.';
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
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        skills,
        budgetMin: Number(form.budgetMin),
        budgetMax: Number(form.budgetMax),
        deadline: new Date(`${form.deadline}T23:59:00`).toISOString(),
      });
    } catch (err) {
      setServerError(errorMessage(err));
      setBusy(false);
    }
  };

  const invalid = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-7">
      {serverError && <Alert type="error">{serverError}</Alert>}

      <Field id="title" label="Project title" hint="A short, clear headline. For example: Build a portfolio website in React." error={errors.title}>
        <input id="title" name="title" maxLength={120} className="input" value={form.title} onChange={update} {...invalid('title')} />
      </Field>

      <Field id="description" label="Description" hint={`${form.description.trim().length}/5000 characters. Say what you need, what you already have, and what a finished result looks like.`} error={errors.description}>
        <textarea id="description" name="description" rows={7} maxLength={5000} className="input" value={form.description} onChange={update} {...invalid('description')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="Category" error={errors.category}>
          <select id="category" name="category" className="input" value={form.category} onChange={update} {...invalid('category')}>
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id="skills" label="Skills needed" hint="Separate with commas, for example: react, node.js" error={errors.skills}>
          <input id="skills" name="skills" className="input" value={form.skills} onChange={update} {...invalid('skills')} />
        </Field>
      </div>

      {skills.length > 0 && (
        <ul className="-mt-2 flex flex-wrap gap-1.5" aria-label="Skills preview">
          {skills.map((s) => (
            <li key={s} className="chip">{s}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="budgetMin" label="Lowest budget (₹)" error={errors.budgetMin}>
          <input id="budgetMin" name="budgetMin" type="number" min="0" className="input" value={form.budgetMin} onChange={update} {...invalid('budgetMin')} />
        </Field>
        <Field id="budgetMax" label="Highest budget (₹)" error={errors.budgetMax}>
          <input id="budgetMax" name="budgetMax" type="number" min="0" className="input" value={form.budgetMax} onChange={update} {...invalid('budgetMax')} />
        </Field>
        <Field id="deadline" label="Deadline" error={errors.deadline}>
          <input id="deadline" name="deadline" type="date" min={toDateInput(new Date())} className="input" value={form.deadline} onChange={update} {...invalid('deadline')} />
        </Field>
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
