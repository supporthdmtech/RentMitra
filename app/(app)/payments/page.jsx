"use client";

import { useEffect, useState } from "react";
import {
  getAllPaymentsForOwner,
  getProfile,
  markPaymentPaid,
  undoPaymentPaid,
} from "@/lib/queries";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import { paymentStatus } from "@/lib/dueDate";
import PaymentCard from "@/components/PaymentCard";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
];

export default function PaymentsPage() {
  const [filter, setFilter] = useState("all");
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllPaymentsForOwner(), getProfile()]).then(([paymentData, profileData]) => {
      setPayments(paymentData);
      setProfile(profileData);
      setLoading(false);
    });
  }, []);

  async function handleMarkPaid(payment) {
    await markPaymentPaid(payment);
    setPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? { ...p, paid_at: new Date().toISOString() } : p))
    );
  }

  async function handleUndo(payment) {
    await undoPaymentPaid(payment);
    setPayments((prev) => prev.map((p) => (p.id === payment.id ? { ...p, paid_at: null } : p)));
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

  return (
    <div>
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-5 pb-4 pt-6 text-white">
        <div className="font-heading text-xl font-bold">Payments</div>
      </div>

      <div className="p-5">
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

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : filtered.length === 0 ? (
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
