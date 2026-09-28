// A payment's status is never stored — it's always derived from
// paid_at + due_date so there's no separate job needed to "flip"
// pending -> overdue as time passes.
//
// Due dates are per-tenant: the first cycle is due 30 days after
// move_in_date, and each following cycle is due 30 days after the
// previous one — not tied to the calendar month.

export function paymentStatus(payment, today = new Date()) {
  if (payment.paid_at) return "paid";
  const dueDate = new Date(payment.due_date);
  return today > dueDate ? "overdue" : "pending";
}

export function daysOverdue(payment, today = new Date()) {
  const dueDate = new Date(payment.due_date);
  const diffMs = today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function daysUntilDue(payment, today = new Date()) {
  const dueDate = new Date(payment.due_date);
  const diffMs = dueDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// current = not overdue (paid, or due date hasn't arrived yet)
// medium  = 1-15 days overdue
// critical = 16+ days overdue
export function riskTier(payment, today = new Date()) {
  if (paymentStatus(payment, today) !== "overdue") return "current";
  return daysOverdue(payment, today) >= 16 ? "critical" : "medium";
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

// Date-only arithmetic done in UTC so adding days never shifts by the
// local timezone's DST changes. dateLike is a "YYYY-MM-DD" string (or
// anything Date can parse), which JS always parses as UTC midnight.
export function addDays(dateLike, days) {
  const d = new Date(dateLike);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days)
  )
    .toISOString()
    .slice(0, 10);
}

// A tenant's very first rent cycle: due 30 days after they move in.
export function firstDueDate(moveInDate) {
  return addDays(moveInDate, 30);
}

// Every cycle after that is another 30 days on from the last one.
export function nextDueDate(previousDueDate) {
  return addDays(previousDueDate, 30);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
