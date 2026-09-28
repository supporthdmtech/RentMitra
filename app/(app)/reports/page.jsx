"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveProperties, getPaymentsInRange } from "@/lib/queries";
import { currentPeriodMonth, formatCurrency, formatMonthYear, paymentStatus } from "@/lib/dueDate";
import { downloadIncomeReportPdf } from "@/lib/reportPdf";
import { downloadCsv } from "@/lib/csv";

function endOfMonth(periodMonth) {
  const d = new Date(periodMonth);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const thisMonth = useMemo(() => currentPeriodMonth(), []);
  const [mode, setMode] = useState("month"); // "month" | "range"
  const [from, setFrom] = useState(thisMonth);
  const [to, setTo] = useState(endOfMonth(thisMonth));
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveProperties().then(setProperties);
  }, []);

  useEffect(() => {
    setLoading(true);
    getPaymentsInRange(from, to).then((data) => {
      setPayments(data);
      setLoading(false);
    });
  }, [from, to]);

  const totals = payments.reduce(
    (acc, p) => {
      const status = paymentStatus(p);
      acc[status] += Number(p.amount_due);
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0 }
  );

  const byProperty = properties
    .map((property) => {
      const rows = payments.filter((p) => p.property_id === property.id);
      const tenantIds = new Set(rows.map((r) => r.tenant_id));
      return {
        id: property.id,
        name: property.name,
        paid: rows.filter((r) => paymentStatus(r) === "paid").reduce((s, r) => s + Number(r.amount_due), 0),
        pending: rows.filter((r) => paymentStatus(r) === "pending").reduce((s, r) => s + Number(r.amount_due), 0),
        overdue: rows.filter((r) => paymentStatus(r) === "overdue").reduce((s, r) => s + Number(r.amount_due), 0),
        tenantCount: tenantIds.size,
      };
    })
    .filter((p) => p.tenantCount > 0);

  const rangeLabel = mode === "month" ? formatMonthYear(from) : `${from} to ${to}`;

  function handleDownloadPdf() {
    downloadIncomeReportPdf({ rangeLabel, properties: byProperty, totals });
  }

  function handleDownloadCsv() {
    downloadCsv(
      `rentmitra-payments-${from}-to-${to}.csv`,
      payments.map((p) => ({
        property: p.property?.name,
        tenant: p.tenant?.name,
        period_month: p.period_month,
        amount_due: p.amount_due,
        status: paymentStatus(p),
        paid_at: p.paid_at || "",
      }))
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-5 py-5 text-white">
        <div className="font-heading text-xl font-bold">Income Reports</div>
        <div className="mt-1 text-xs opacity-90">{rangeLabel}</div>
      </div>

      <div className="p-6">
        <div className="mb-5 flex gap-2 text-xs font-semibold">
          <button
            onClick={() => {
              setMode("month");
              setFrom(thisMonth);
              setTo(endOfMonth(thisMonth));
            }}
            className={`rounded-lg px-3 py-1.5 ${mode === "month" ? "bg-purple-100 text-purple-700" : "border border-gray-200 text-gray-500"}`}
          >
            This month
          </button>
          <button
            onClick={() => setMode("range")}
            className={`rounded-lg px-3 py-1.5 ${mode === "range" ? "bg-purple-100 text-purple-700" : "border border-gray-200 text-gray-500"}`}
          >
            Custom range
          </button>
        </div>

        {mode === "range" ? (
          <div className="mb-6 flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-center">
          <div className="mb-2 text-xs font-semibold text-purple-600">TOTAL COLLECTED</div>
          <div className="font-heading mb-3 text-4xl font-extrabold text-purple-600">
            {formatCurrency(totals.paid)}
          </div>
          <div className="text-xs text-purple-400">
            Pending {formatCurrency(totals.pending)} • Overdue {formatCurrency(totals.overdue)}
          </div>
        </div>

        <div className="mb-6">
          <div className="font-heading mb-3 text-sm font-bold">Property Breakdown</div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : byProperty.length === 0 ? (
            <p className="text-sm text-gray-500">No payment records in this range.</p>
          ) : (
            byProperty.map((p) => (
              <div key={p.id} className="mb-2.5 rounded-lg border-l-4 border-blue-600 bg-sky-50 p-3">
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{p.name}</span>
                  <span className="text-blue-600">{formatCurrency(p.paid)}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {p.tenantCount} tenant{p.tenantCount === 1 ? "" : "s"} • Pending {formatCurrency(p.pending)} • Overdue{" "}
                  {formatCurrency(p.overdue)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleDownloadPdf}
            className="font-heading w-full rounded-lg border-[1.5px] border-purple-200 py-3.5 text-sm font-bold text-purple-600"
          >
            📥 Download Report (PDF)
          </button>
          <button
            onClick={handleDownloadCsv}
            className="font-heading w-full rounded-lg border-[1.5px] border-gray-200 py-3.5 text-sm font-bold text-gray-600"
          >
            Export raw data (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
