import AppError from './AppError.js';

// Returns the value only if it is a plain string (blocks ?field[$ne]=x style attacks).
export const str = (v) => (typeof v === 'string' ? v : undefined);

// Escapes characters that have a special meaning in regular expressions.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Checks an array of skills, lowercases, trims and removes duplicates.
export const normalizeSkills = (value, { max = 15, min = 0 } = {}) => {
  if (!Array.isArray(value)) throw new AppError('Skills must be a list', 400);
  const cleaned = [];
  for (const item of value) {
    if (typeof item !== 'string') throw new AppError('Each skill must be text', 400);
    const s = item.trim().toLowerCase();
    if (!s) continue;
    if (s.length > 30) throw new AppError('Each skill must be at most 30 characters', 400);
    if (!cleaned.includes(s)) cleaned.push(s);
  }
  if (cleaned.length < min) throw new AppError(`Please add at least ${min} skill`, 400);
  if (cleaned.length > max) throw new AppError(`You can add at most ${max} skills`, 400);
  return cleaned;
};

// Reads ?page= and ?limit= safely.
export const parsePagination = (query, defaultLimit = 10, maxLimit = 50) => {
  const page = Math.max(1, parseInt(str(query.page), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(str(query.limit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};
