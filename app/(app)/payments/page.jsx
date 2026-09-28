"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPaymentsForMonth,
  getProfile,
  markPaymentPaid,
  undoPaymentPaid,
} from "@/lib/queries";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import PaymentCard from "@/components/PaymentCard";

function lastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { month: "short" }),
    });
  }
  return months;
}

export default function PaymentsPage() {
  const months = useMemo(lastSixMonths, []);
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  useEffect(() => {
    setLoading(true);
    getPaymentsForMonth(selectedMonth).then((data) => {
      setPayments(data);
      setLoading(false);
    });
  }, [selectedMonth]);

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

  return (
    <div>
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-5 pb-4 pt-6 text-white">
        <div className="font-heading text-xl font-bold">Payments</div>
      </div>

      <div className="p-5">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {months.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMonth(m.value)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold ${
                selectedMonth === m.value
                  ? "bg-sky-100 text-sky-700"
                  : "border border-gray-200 bg-white text-gray-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">No rent records for this month.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                subtitle={payment.tenant?.name}
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
