"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getAllPaymentsForOwner,
  getProfile,
  markPaymentPaid,
  oldestUnpaidPerTenant,
  undoPaymentPaid,
} from "@/lib/queries";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import { daysOverdue, paymentStatus } from "@/lib/dueDate";
import { useCachedQuery } from "@/lib/useCachedQuery";
import PaymentCard from "@/components/PaymentCard";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
];

async function loadPayments() {
  const [payments, profile] = await Promise.all([getAllPaymentsForOwner(), getProfile()]);
  return { payments, profile };
}

export default function PaymentsPage() {
  const [filter, setFilter] = useState("all");
  const { data, setData } = useCachedQuery("payments", loadPayments);

  if (!data) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const { payments, profile } = data;

  async function handleMarkPaid(payment) {
    await markPaymentPaid(payment);
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p.id === payment.id ? { ...p, paid_at: new Date().toISOString() } : p
      ),
    }));
  }

  async function handleUndo(payment) {
    await undoPaymentPaid(payment);
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.id === payment.id ? { ...p, paid_at: null } : p)),
    }));
  }

  function handleRemind(payment) {
    const url = buildWhatsAppReminderUrl({
      template: profile?.whatsapp_template,
      tenant: payment.tenant,
      payment,
      upi: profile?.upi_id,
    });
    window.open(url, "_blank");
  }

  const filtered = filter === "all" ? payments : payments.filter((p) => paymentStatus(p) === filter);
  const overdue = oldestUnpaidPerTenant(payments.filter((p) => paymentStatus(p) === "overdue"));
  const criticalCount = overdue.filter((p) => daysOverdue(p) >= 16).length;

  return (
    <div>
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-5 pb-4 pt-6 text-white">
        <div className="font-heading text-xl font-bold">Payments</div>
      </div>

      <div className="p-5">
        {overdue.length > 0 ? (
          <Link
            href="/at-risk"
            className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-xs"
          >
            <span className="font-semibold text-red-700">
              {overdue.length} overdue{criticalCount > 0 ? ` — ${criticalCount} critical` : ""}
            </span>
            <span className="font-bold text-red-600">View At-Risk breakdown →</span>
          </Link>
        ) : null}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold ${
                filter === f.value
                  ? "bg-sky-100 text-sky-700"
                  : "border border-gray-200 bg-white text-gray-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No rent records here.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                subtitle={payment.tenant?.name}
                meta={payment.property?.name}
                onMarkPaid={() => handleMarkPaid(payment)}
                onUndo={() => handleUndo(payment)}
                onRemind={payment.tenant?.phone ? () => handleRemind(payment) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
