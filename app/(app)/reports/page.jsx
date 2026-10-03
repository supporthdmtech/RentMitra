"use client";

import { useMemo, useState } from "react";
import { getActiveProperties, getPaymentsCollectedInRange, getUnpaidPayments } from "@/lib/queries";
import { addDays, formatCurrency, formatDate, paymentStatus, todayIso } from "@/lib/dueDate";
import { downloadIncomeReportPdf } from "@/lib/reportPdf";
import { downloadCsv } from "@/lib/csv";
import { useCachedQuery } from "@/lib/useCachedQuery";

function last30DaysRange() {
  const to = todayIso();
  return { from: addDays(to, -30), to };
}

export default function ReportsPage() {
  const defaultRange = useMemo(last30DaysRange, []);
  const [mode, setMode] = useState("recent"); // "recent" | "range"
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const { data: properties } = useCachedQuery("reports-properties", getActiveProperties);
  // "Collected" is cash-basis: payments actually RECEIVED in this window,
  // regardless of which month's rent cycle they happened to settle — so
  // paying off an old overdue cycle today counts as today's income, not
  // something buried in a past month. Pending/Overdue are a live snapshot
  // (not date-range-bound — "outstanding" is a balance as of now, not a
  // flow over a period).
  const { data: collected, loading } = useCachedQuery(
    `reports-collected:${from}:${to}`,
    () => getPaymentsCollectedInRange(from, to),
    [from, to]
  );
  const { data: unpaid } = useCachedQuery("reports-unpaid", getUnpaidPayments);

  const collectedRows = collected || [];
  const unpaidRows = unpaid || [];

  const totals = {
    paid: collectedRows.reduce((s, p) => s + Number(p.amount_due), 0),
    pending: unpaidRows
      .filter((p) => paymentStatus(p) === "pending")
      .reduce((s, p) => s + Number(p.amount_due), 0),
    overdue: unpaidRows
      .filter((p) => paymentStatus(p) === "overdue")
      .reduce((s, p) => s + Number(p.amount_due), 0),
  };

  const byProperty = (properties || [])
    .map((property) => {
      const paidRows = collectedRows.filter((p) => p.property_id === property.id);
      const propertyUnpaid = unpaidRows.filter((p) => p.property_id === property.id);
      const tenantIds = new Set([...paidRows, ...propertyUnpaid].map((r) => r.tenant_id));
      return {
        id: property.id,
        name: property.name,
        paid: paidRows.reduce((s, r) => s + Number(r.amount_due), 0),
        pending: propertyUnpaid
          .filter((r) => paymentStatus(r) === "pending")
          .reduce((s, r) => s + Number(r.amount_due), 0),
        overdue: propertyUnpaid
          .filter((r) => paymentStatus(r) === "overdue")
          .reduce((s, r) => s + Number(r.amount_due), 0),
        tenantCount: tenantIds.size,
      };
    })
    .filter((p) => p.tenantCount > 0);

  const rangeLabel = `${formatDate(from)} – ${formatDate(to)}`;

  function handleDownloadPdf() {
    downloadIncomeReportPdf({ rangeLabel, properties: byProperty, totals });
  }

  function handleDownloadCsv() {
    downloadCsv(
      `rentmitra-collections-${from}-to-${to}.csv`,
      collectedRows.map((p) => ({
        property: p.property?.name,
        tenant: p.tenant?.name,
        due_date: p.due_date,
        amount_due: p.amount_due,
        paid_at: p.paid_at,
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
              setMode("recent");
              setFrom(defaultRange.from);
              setTo(defaultRange.to);
            }}
            className={`rounded-lg px-3 py-1.5 ${mode === "recent" ? "bg-purple-100 text-purple-700" : "border border-gray-200 text-gray-500"}`}
          >
            Last 30 days
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
          <div className="mb-2 text-xs font-semibold text-purple-600">COLLECTED IN THIS PERIOD</div>
          <div className="font-heading mb-3 text-4xl font-extrabold text-purple-600">
            {formatCurrency(totals.paid)}
          </div>
          <div className="text-xs text-purple-400">
            Outstanding as of today — Pending {formatCurrency(totals.pending)} • Overdue{" "}
            {formatCurrency(totals.overdue)}
          </div>
        </div>

        <div className="mb-6">
          <div className="font-heading mb-3 text-sm font-bold">Property Breakdown</div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : byProperty.length === 0 ? (
            <p className="text-sm text-gray-500">No payment activity to show.</p>
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
