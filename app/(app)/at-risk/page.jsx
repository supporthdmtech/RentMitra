"use client";

import { getProfile, getUnpaidPayments, oldestUnpaidPerTenant } from "@/lib/queries";
import { daysOverdue, formatCurrency, formatMonthLabel, paymentStatus } from "@/lib/dueDate";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import { useCachedQuery } from "@/lib/useCachedQuery";
import GradientHeader from "@/components/GradientHeader";

async function loadAtRisk() {
  const [unpaid, profile] = await Promise.all([getUnpaidPayments(), getProfile()]);
  return { unpaid, profile };
}

export default function AtRiskPage() {
  const { data } = useCachedQuery("at-risk", loadAtRisk);
  const unpaid = data?.unpaid || [];
  const profile = data?.profile;

  // Collapse a tenant's multiple missed cycles down to their oldest (worst)
  // one for severity, but annotate it with the TOTAL they owe across every
  // unpaid cycle (not just this one) — the oldest cycle sets how overdue
  // they are, but the amount should reflect the full outstanding balance.
  const worstPerTenant = oldestUnpaidPerTenant(unpaid.filter((p) => paymentStatus(p) === "overdue")).map(
    (p) => {
      const tenantUnpaid = unpaid.filter((u) => u.tenant_id === p.tenant_id);
      return {
        ...p,
        totalOwed: tenantUnpaid.reduce((s, u) => s + Number(u.amount_due), 0),
        cycleCount: tenantUnpaid.length,
      };
    }
  );
  const critical = worstPerTenant.filter((p) => daysOverdue(p) >= 16).sort((a, b) => daysOverdue(b) - daysOverdue(a));
  const medium = worstPerTenant.filter((p) => daysOverdue(p) < 16).sort((a, b) => daysOverdue(b) - daysOverdue(a));

  function remindUrl(payment) {
    return buildWhatsAppReminderUrl({
      template: profile?.whatsapp_template,
      tenant: payment.tenant,
      // Remind them for the full amount owed across every missed cycle,
      // not just the oldest one.
      payment: { ...payment, amount_due: payment.totalOwed },
      upi: profile?.upi_id,
    });
  }

  return (
    <div>
      <GradientHeader title="At Risk Tenants" subtitle="Action required" gradient="red" backHref="/payments" />

      <div className="p-5">
        {!data ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : worstPerTenant.length === 0 ? (
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
              {formatMonthLabel(p.due_date)} • {formatCurrency(p.totalOwed)} pending
              {p.cycleCount > 1 ? ` (${p.cycleCount} months)` : ""}
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
