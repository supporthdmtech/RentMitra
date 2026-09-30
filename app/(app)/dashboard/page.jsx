"use client";

import Link from "next/link";
import {
  getActiveProperties,
  getAllActiveTenants,
  getAllPaymentsForOwner,
  getAllRooms,
  getProfile,
  latestPerTenant,
} from "@/lib/queries";
import { formatCurrency, paymentStatus } from "@/lib/dueDate";
import { occupancyFor } from "@/lib/rooms";
import { useCachedQuery } from "@/lib/useCachedQuery";

const TYPE_LABEL = { rental: "RENTAL", pg: "PG", hostel: "HOSTEL" };

async function loadDashboard() {
  const [profile, properties, tenants, allPayments, rooms] = await Promise.all([
    getProfile(),
    getActiveProperties(),
    getAllActiveTenants(),
    getAllPaymentsForOwner(),
    getAllRooms(),
  ]);
  // Each tenant's current rent cycle, not a shared calendar month.
  return { profile, properties, tenants, rooms, payments: latestPerTenant(allPayments) };
}

export default function DashboardPage() {
  const { data, loading } = useCachedQuery("dashboard", loadDashboard);

  if (!data) return <CenteredMessage>Loading…</CenteredMessage>;

  const { profile, properties, tenants, rooms, payments } = data;

  const paid = payments.filter((p) => paymentStatus(p) === "paid");
  const pending = payments.filter((p) => paymentStatus(p) === "pending");
  const overdue = payments.filter((p) => paymentStatus(p) === "overdue");
  const totalIncome = paid.reduce((sum, p) => sum + Number(p.amount_due), 0);

  return (
    <div className={loading ? "opacity-90" : ""}>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pb-5 pt-6 text-white">
        <div className="mb-5">
          <div className="font-heading text-xl font-bold">
            Welcome, {profile?.full_name || "Owner"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide opacity-85">
            Current Rent Cycle
          </div>
          <div className="font-heading text-3xl font-extrabold">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-1.5 text-[11px] opacity-80">
            From {properties.length} properties
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-b border-gray-100 p-5">
        <QuickStat label="✓ Paid" color="green" amount={paid.reduce((s, p) => s + Number(p.amount_due), 0)} caption={`${paid.length} tenants`} />
        <QuickStat label="⏱ Pending" color="amber" amount={pending.reduce((s, p) => s + Number(p.amount_due), 0)} caption={`${pending.length} tenants`} />
        <QuickStat label="✕ Overdue" color="red" amount={overdue.reduce((s, p) => s + Number(p.amount_due), 0)} caption={`${overdue.length} tenants`} />
      </div>

      <div className="p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="font-heading text-sm font-bold">Your Properties</div>
          <Link href="/properties/new" className="text-xs font-semibold text-blue-600">
            + Add
          </Link>
        </div>

        {properties.length === 0 ? (
          <p className="text-sm text-gray-500">
            No properties yet — add your first one to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {properties.map((property) => {
              const propertyPayments = payments.filter((p) => p.property_id === property.id);
              const paidCount = propertyPayments.filter((p) => paymentStatus(p) === "paid").length;
              const total = propertyPayments.length;
              const pct = total ? Math.round((paidCount / total) * 100) : 0;
              const collected = propertyPayments
                .filter((p) => paymentStatus(p) === "paid")
                .reduce((s, p) => s + Number(p.amount_due), 0);
              const totalDue = propertyPayments.reduce((s, p) => s + Number(p.amount_due), 0);
              const occupancy = occupancyFor(property, { rooms, tenants });
              const occupiedPct = occupancy.total ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0;
              const unitLabel = occupancy.mode === "bed" ? "beds" : occupancy.mode === "room" ? "rooms" : "units";

              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="block rounded-xl border border-blue-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-blue-600">
                          {TYPE_LABEL[property.type]}
                        </span>
                      </div>
                      <div className="font-heading text-sm font-bold">{property.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {property.address} • {occupancy.occupied} of {occupancy.total} {unitLabel} ({occupiedPct}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600">
                        {paidCount}/{total} Paid
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-emerald-600">
                        {formatCurrency(collected)}
                        <span className="font-normal text-gray-400"> / {formatCurrency(totalDue)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, color, amount, caption }) {
  const styles = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className={`rounded-xl p-3.5 text-center ${styles[color]}`}>
      <div className="mb-1.5 text-[11px] font-semibold">{label}</div>
      <div className="font-heading text-lg font-bold">{formatCurrency(amount)}</div>
      <div className="mt-1 text-[10px] text-gray-500">{caption}</div>
    </div>
  );
}

function CenteredMessage({ children }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">{children}</div>;
}
