import { formatCurrency, formatDate } from "./dueDate";

// Fills {name} {amount} {due_date} {upi} in the owner's saved template and
// opens a wa.me deep link with it pre-filled. No WhatsApp Business API,
// no server involved — the owner still presses Send themselves.
export function buildWhatsAppReminderUrl({ template, tenant, payment, upi }) {
  const message = (template || "")
    .replaceAll("{name}", tenant.name)
    .replaceAll("{amount}", formatCurrency(payment.amount_due))
    .replaceAll("{due_date}", formatDate(payment.period_month))
    .replaceAll("{upi}", upi || "");

  const phone = (tenant.phone || "").replace(/\D/g, "");
  const withCountryCode = phone.length === 10 ? `91${phone}` : phone;

  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
