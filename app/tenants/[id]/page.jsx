"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPaymentsForTenant,
  getProfile,
  getTenant,
  markPaymentPaid,
  moveOutTenant,
  undoPaymentPaid,
} from "@/lib/queries";
import { formatCurrency, formatMonthYear } from "@/lib/dueDate";
import { buildWhatsAppReminderUrl } from "@/lib/whatsapp";
import GradientHeader from "@/components/GradientHeader";
import PaymentCard from "@/components/PaymentCard";

export default function TenantPaymentHistoryPage() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmMoveOut, setConfirmMoveOut] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const [tenantData, paymentData, profileData] = await Promise.all([
      getTenant(id),
      getPaymentsForTenant(id),
      getProfile(),
    ]);
    setTenant(tenantData);
    setPayments(paymentData);
    setProfile(profileData);
    setLoading(false);
  }

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
      tenant,
      payment,
      upi: profile?.upi_id,
    });
    window.open(url, "_blank");
  }

  async function handleMoveOut() {
    await moveOutTenant(id);
    setTenant((prev) => ({ ...prev, status: "inactive" }));
    setConfirmMoveOut(false);
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  const totalPaid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount_due), 0);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <GradientHeader
        title={tenant.name}
        subtitle={`${tenant.property?.name} • Room ${tenant.room_no}${tenant.status === "inactive" ? " • Moved out" : ""}`}
        gradient="orange"
        backHref={`/properties/${tenant.property_id}`}
      />

      <div className="p-5">
        <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-100 p-4">
          <div>
            <div className="text-[11px] font-semibold text-gray-500">Monthly rent</div>
            <div className="font-heading text-lg font-bold">{formatCurrency(tenant.monthly_rent)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-gray-500">Total collected</div>
            <div className="font-heading text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3">
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payment records yet.</p>
          ) : (
            payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                subtitle={formatMonthYear(payment.period_month)}
                onMarkPaid={() => handleMarkPaid(payment)}
                onUndo={() => handleUndo(payment)}
                onRemind={tenant.phone ? () => handleRemind(payment) : undefined}
              />
            ))
          )}
        </div>

        {tenant.status === "active" ? (
          confirmMoveOut ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="mb-3">
                Mark {tenant.name} as moved out? Their payment history stays, and room {tenant.room_no} becomes
                available for a new tenant.
              </p>
              <div className="flex gap-2">
                <button onClick={handleMoveOut} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">
                  Confirm Move-Out
                </button>
                <button onClick={() => setConfirmMoveOut(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmMoveOut(true)}
              className="w-full rounded-xl border-[1.5px] border-gray-200 py-3 text-sm font-bold text-gray-500"
            >
              Mark as Moved Out
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
