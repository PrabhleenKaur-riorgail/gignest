export const inr = (amount) =>
  '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const budgetRange = (min, max) => (min === max ? inr(min) : `${inr(min)} to ${inr(max)}`);

export const shortDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const monthLabel = (yyyyMm) =>
  new Date(`${yyyyMm}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });

export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return shortDate(date);
};

export const daysLeft = (date) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

export const deadlineText = (date) => {
  const left = daysLeft(date);
  if (left < 0) return 'Deadline passed';
  if (left === 0) return 'Due today';
  return `${left} day${left === 1 ? '' : 's'} left`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
