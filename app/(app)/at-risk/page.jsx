"use client";

import { useEffect, useState } from "react";
import { getProfile, getUnpaidPayments, oldestUnpaidPerTenant } from "@/lib/queries";
import { daysOverdue, formatCurrency, formatDate, paymentStatus } from "@/lib/dueDate";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import GradientHeader from "@/components/GradientHeader";

export default function AtRiskPage() {
  const [unpaid, setUnpaid] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUnpaidPayments(), getProfile()]).then(([unpaidData, profileData]) => {
      setUnpaid(unpaidData);
      setProfile(profileData);
      setLoading(false);
    });
  }, []);

  // Collapse a tenant's multiple missed cycles down to their oldest (worst)
  // one, so they appear once at their true severity.
  const overdue = oldestUnpaidPerTenant(unpaid.filter((p) => paymentStatus(p) === "overdue"));
  const critical = overdue.filter((p) => daysOverdue(p) >= 16).sort((a, b) => daysOverdue(b) - daysOverdue(a));
  const medium = overdue.filter((p) => daysOverdue(p) < 16).sort((a, b) => daysOverdue(b) - daysOverdue(a));

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
      <GradientHeader title="At Risk Tenants" subtitle="Action required" gradient="red" backHref="/alerts" />

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : overdue.length === 0 ? (
          <p className="text-sm text-gray-500">No overdue tenants right now.</p>
        ) : (
          <>
            {critical.length > 0 ? (
              <RiskGroup title="🔴 Critical (16-30+ days overdue)" items={critical} remindUrl={remindUrl} tier="critical" />
            ) : null}
            {medium.length > 0 ? (
              <RiskGroup title="🟡 Medium (1-15 days overdue)" items={medium} remindUrl={remindUrl} tier="medium" />
            ) : null}
          </>
        )}

        <div className="mt-2 rounded-lg bg-gray-100 p-3 text-[11px] leading-relaxed text-gray-500">
          <strong className="text-black">Quick Actions:</strong>
          <br />• Call tenant directly
          <br />• Escalate on WhatsApp
          <br />• Send automated reminders
        </div>
      </div>
    </div>
  );
}

function RiskGroup({ title, items, remindUrl, tier }) {
  return (
    <div className="mb-6">
      <div className="font-heading mb-3 text-xs font-bold">{title}</div>
      <div className="flex flex-col gap-3">
        {items.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border-l-4 p-3.5 ${
              tier === "critical" ? "border-l-red-600 bg-red-50" : "border-l-amber-500 bg-amber-50"
            }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">{p.tenant?.name}</div>
                <div className="text-[11px] text-gray-500">{p.property?.name}</div>
              </div>
              <span
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold text-white ${
                  tier === "critical" ? "bg-red-600" : "bg-amber-500"
                }`}
              >
                {daysOverdue(p)} DAYS
              </span>
            </div>
            <div className="mb-2.5 text-xs text-gray-600">
              Due {formatDate(p.due_date)} • {formatCurrency(p.amount_due)} pending
            </div>
            {p.tenant?.phone ? (
              tier === "critical" ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${p.tenant.phone}`}
                    className="rounded-md border border-red-300 bg-white py-1.5 text-center text-[11px] font-bold text-red-600"
                  >
                    Call
                  </a>
                  <a
                    href={remindUrl(p)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-[#25D366] py-1.5 text-center text-[11px] font-bold text-white"
                  >
                    Escalate on WhatsApp
                  </a>
                </div>
              ) : (
                <a
                  href={remindUrl(p)}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-amber-300 bg-white py-2 text-center text-[11px] font-bold text-amber-600"
                >
                  Send Reminder
                </a>
              )
            ) : (
              <span className="block rounded-md border border-gray-200 bg-gray-100 py-2 text-center text-[11px] font-bold text-gray-400">
                No phone number on file
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
