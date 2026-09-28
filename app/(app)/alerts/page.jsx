"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProfile, getRecentlyPaidPayments, getUnpaidPayments, oldestUnpaidPerTenant } from "@/lib/queries";
import { daysOverdue, daysUntilDue, formatCurrency, formatDate, paymentStatus } from "@/lib/dueDate";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";

export default function AlertsPage() {
  const [unpaid, setUnpaid] = useState([]);
  const [recentlyPaid, setRecentlyPaid] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const [unpaidData, paidData, profileData] = await Promise.all([
        getUnpaidPayments(),
        getRecentlyPaidPayments(threeDaysAgo.toISOString()),
        getProfile(),
      ]);
      setUnpaid(unpaidData);
      setRecentlyPaid(paidData);
      setProfile(profileData);
      setLoading(false);
    }
    load();
  }, []);

  // A tenant who's missed several cycles has several unpaid rows — collapse
  // to their oldest (worst) one so they show up once, not several times.
  const overdue = oldestUnpaidPerTenant(unpaid.filter((p) => paymentStatus(p) === "overdue")).sort(
    (a, b) => daysOverdue(b) - daysOverdue(a)
  );
  const dueSoon = unpaid.filter((p) => paymentStatus(p) === "pending");

  const activeCount = overdue.length + dueSoon.length + recentlyPaid.length;

  function remindUrl(payment) {
    return buildWhatsAppReminderUrl({
      template: profile?.whatsapp_template,
      tenant: payment.tenant,
      payment,
      upi: profile?.upi_id,
    });
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-orange-500 to-pink-500 px-5 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-heading text-xl font-bold">Alerts</div>
            <div className="mt-1 text-xs opacity-90">{activeCount} active reminders</div>
          </div>
          <div className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">🔔 {activeCount}</div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : activeCount === 0 ? (
          <p className="text-sm text-gray-500">All caught up — no alerts right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {overdue.map((p) => (
              <AlertCard
                key={p.id}
                tone="red"
                title="⚠️ Overdue Payment"
                badge={`${daysOverdue(p)} days`}
                body={`${p.tenant?.name} hasn't paid rent for ${p.property?.name} since ${formatDate(p.due_date)}`}
                actionLabel="Follow Up"
                actionHref={p.tenant?.phone ? remindUrl(p) : undefined}
              />
            ))}
            {dueSoon.map((p) => (
              <AlertCard
                key={p.id}
                tone="amber"
                title="⏰ Due Soon"
                badge={formatDate(p.due_date)}
                body={`${p.tenant?.name}'s rent for ${p.property?.name} is due on ${formatDate(p.due_date)}${
                  daysUntilDue(p) >= 0 ? ` (in ${daysUntilDue(p)} days)` : ""
                }`}
                actionLabel="Send Reminder"
                actionHref={p.tenant?.phone ? remindUrl(p) : undefined}
              />
            ))}
            {recentlyPaid.map((p) => (
              <AlertCard
                key={p.id}
                tone="green"
                title="✓ Payment Received"
                badge={formatDate(p.paid_at)}
                body={`${p.tenant?.name} paid ${formatCurrency(p.amount_due)} for ${p.property?.name}`}
                actionLabel="View"
                actionHref={`/tenants/${p.tenant?.id}`}
              />
            ))}
          </div>
        )}

        <Link
          href="/at-risk"
          className="mt-5 block rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-600"
        >
          View At-Risk Tenants →
        </Link>
      </div>
    </div>
  );
}

function AlertCard({ tone, title, badge, body, actionLabel, actionHref }) {
  const styles = {
    red: "bg-red-50 border-red-100 border-l-red-600",
    amber: "bg-amber-50 border-amber-100 border-l-amber-500",
    green: "bg-green-50 border-green-100 border-l-emerald-600",
  };
  const textStyles = {
    red: "text-red-800",
    amber: "text-amber-800",
    green: "text-green-800",
  };

  return (
    <div className={`rounded-lg border border-l-4 p-3.5 ${styles[tone]}`}>
      <div className="mb-2 flex items-start justify-between">
        <div className={`text-sm font-bold ${textStyles[tone]}`}>{title}</div>
        <span className="text-[10px] font-semibold text-gray-500">{badge}</span>
      </div>
      <div className={`mb-2.5 text-xs ${textStyles[tone]}`}>{body}</div>
      {actionHref ? (
        <a
          href={actionHref}
          target={actionHref.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700"
        >
          {actionLabel}
        </a>
      ) : (
        <span className="inline-block rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-400">
          No phone number
        </span>
      )}
    </div>
  );
}
