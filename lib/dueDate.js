// A payment's status is never stored — it's always derived from
// paid_at + period_month so there's no separate job needed to "flip"
// pending -> overdue at midnight.

export function paymentStatus(payment, today = new Date()) {
  if (payment.paid_at) return "paid";
  const dueDate = new Date(payment.period_month);
  return today > dueDate ? "overdue" : "pending";
}

export function daysOverdue(payment, today = new Date()) {
  const dueDate = new Date(payment.period_month);
  const diffMs = today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function daysUntilDue(payment, today = new Date()) {
  const dueDate = new Date(payment.period_month);
  const diffMs = dueDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatMonthYear(dateLike) {
  return new Date(dateLike).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatDate(dateLike) {
  return new Date(dateLike).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// First-of-current-month as an ISO date string ("YYYY-MM-01") — used both
// for generating this month's payment rows and for the month picker.
export function currentPeriodMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}
