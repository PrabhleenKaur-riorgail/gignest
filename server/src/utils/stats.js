// Small helpers for building chart-ready numbers.

const monthKey = (date) => new Date(date).toISOString().slice(0, 7); // "2026-11"

// The last n months as "YYYY-MM", oldest first, including the current month.
export const lastMonths = (n = 6) => {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return months;
};

export const round2 = (n) => Math.round(n * 100) / 100;

// Adds up `field` of each row per month. Months with no data show 0, so charts have no gaps.
export const sumByMonth = (rows, field, months = lastMonths()) => {
  const totals = Object.fromEntries(months.map((m) => [m, 0]));
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    if (key in totals) totals[key] += row[field];
  }
  return months.map((month) => ({ month, amount: round2(totals[month]) }));
};

export const countBy = (rows, field) => {
  const out = {};
  for (const row of rows) out[row[field]] = (out[row[field]] || 0) + 1;
  return out;
};
