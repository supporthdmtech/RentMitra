"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPaymentsForProperty,
  getProperty,
  getRoomsForProperty,
  getTenantsByProperty,
  latestPerTenant,
  softDeleteProperty,
} from "@/lib/queries";
import { formatCurrency, paymentStatus } from "@/lib/dueDate";
import { isRoomBased, occupancyFor, roomBreakdown } from "@/lib/rooms";
import StatusPill from "@/components/StatusPill";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(0); // 0 = none, 1 = first confirm, 2 = second (has tenants)

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const [propertyData, tenantData, paymentData, roomData] = await Promise.all([
      getProperty(id),
      getTenantsByProperty(id),
      getPaymentsForProperty(id),
      getRoomsForProperty(id),
    ]);
    setProperty(propertyData);
    setTenants(tenantData);
    setRooms(roomData);
    setAllPayments(paymentData);
    setLoading(false);
  }

  async function handleDelete() {
    if (confirmDelete === 0) {
      setConfirmDelete(tenants.length > 0 ? 1 : 2);
      return;
    }
    if (confirmDelete === 1) {
      setConfirmDelete(2);
      return;
    }
    await softDeleteProperty(id);
    router.push("/dashboard");
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  // "Collected" reflects each tenant's current cycle; "Due" must count
  // EVERY unpaid cycle, not just the latest, so a tenant behind by 2
  // months counts for both.
  const currentCycle = latestPerTenant(allPayments);
  const unpaid = allPayments.filter((p) => paymentStatus(p) !== "paid");
  const collected = currentCycle
    .filter((p) => paymentStatus(p) === "paid")
    .reduce((s, p) => s + Number(p.amount_due), 0);
  const due = unpaid.reduce((s, p) => s + Number(p.amount_due), 0);
  const roomBased = isRoomBased(property);
  const occupancy = occupancyFor(property, { rooms, tenants });
  const unitLabel = occupancy.mode === "bed" ? "beds" : occupancy.mode === "room" ? "rooms" : "units";
  const occupiedPct = occupancy.total ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0;
  const breakdown = roomBreakdown(property, { rooms, tenants });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <div className="bg-gradient-to-br from-orange-500 to-pink-500 px-5 pb-5 pt-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm">
            ←
          </Link>
          <div className="flex gap-2">
            <Link href={`/properties/new?edit=${id}`} className="rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-bold">
              ✎ Edit
            </Link>
            <button onClick={handleDelete} className="rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-bold">
              🗑 Delete
            </button>
          </div>
        </div>
        <div className="mb-2 flex gap-1.5">
          <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold">
            {property.type.toUpperCase()}
          </span>
          {roomBased && occupancy.mode ? (
            <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold">
              {occupancy.mode === "bed" ? "BED-WISE" : occupancy.mode === "room" ? "ROOM-WISE" : "MIXED BILLING"}
            </span>
          ) : null}
        </div>
        <div className="font-heading text-xl font-bold">{property.name}</div>
        <div className="mt-0.5 text-xs opacity-90">📍 {property.address}</div>
      </div>

      {confirmDelete > 0 ? (
        <div className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {confirmDelete === 1 ? (
            <p className="mb-3">
              This property has {tenants.length} active tenant{tenants.length === 1 ? "" : "s"}. Deleting it will
              also remove their records. Continue?
            </p>
          ) : (
            <p className="mb-3">Are you sure? This can&apos;t be undone from here.</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleDelete} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">
              {confirmDelete === 1 ? "Yes, continue" : "Delete permanently"}
            </button>
            <button onClick={() => setConfirmDelete(0)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3.5 p-5">
        <div className="rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="mb-1 text-[11px] font-semibold text-gray-500">CURRENT RENT CYCLE</div>
          <div className="mb-2.5 flex items-end justify-between">
            <div className="font-heading text-2xl font-extrabold text-emerald-600">{formatCurrency(collected)}</div>
            <div className="text-xs text-gray-500">of {formatCurrency(collected + due)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-green-50 p-2.5">
              <div className="text-[10px] font-semibold text-green-700">Collected</div>
              <div className="text-sm font-bold text-green-700">{formatCurrency(collected)}</div>
            </div>
            <div className="rounded-lg bg-red-50 p-2.5">
              <div className="text-[10px] font-semibold text-red-700">Due</div>
              <div className="text-sm font-bold text-red-700">{formatCurrency(due)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="mb-2 flex justify-between text-xs font-bold">
            <span>Occupancy</span>
            <span className="text-orange-500">
              {occupancy.occupied} of {occupancy.total} {unitLabel} · {occupiedPct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-orange-100">
            <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500" style={{ width: `${occupiedPct}%` }} />
          </div>

          {roomBased ? (
            <>
              <div className="mt-3 flex flex-col gap-1.5">
                {breakdown.map(({ room, beds, tenant }) => (
                  <div key={room.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">
                      Room {room.room_no}{" "}
                      <span className="text-gray-300">({room.billing_mode === "bed" ? "bed-wise" : "room-wise"})</span>
                    </span>
                    {room.billing_mode === "bed" ? (
                      <span className="font-semibold">
                        {beds.filter((b) => b.tenant).length}/{beds.length} beds
                      </span>
                    ) : (
                      <span className={`font-semibold ${tenant ? "text-red-500" : "text-green-600"}`}>
                        {tenant ? "Occupied" : "Vacant"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <Link href={`/properties/${id}/rooms`} className="mt-3 block text-[11px] font-bold text-blue-600">
                Manage Rooms →
              </Link>
            </>
          ) : null}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="font-heading text-sm font-bold">Tenants ({tenants.length})</div>
          <Link href={`/properties/${id}/tenants/new`} className="text-xs font-bold text-blue-600">
            + Add Tenant
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {tenants.length === 0 ? (
            <p className="text-sm text-gray-500">No tenants yet.</p>
          ) : (
            tenants.map((tenant) => {
              const payment = currentCycle.find((p) => p.tenant_id === tenant.id);
              const unpaidCycles = unpaid.filter((p) => p.tenant_id === tenant.id).length;
              return (
                <Link
                  key={tenant.id}
                  href={`/tenants/${tenant.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                    {tenant.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{tenant.name}</div>
                    <div className="text-[11px] text-gray-500">
                      Room {tenant.room_no}
                      {tenant.bed_id ? ` • Bed ${bedLabelFor(rooms, tenant.bed_id)}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatCurrency(tenant.monthly_rent)}</div>
                    {payment ? (
                      <StatusPill
                        status={paymentStatus(payment)}
                        suffix={unpaidCycles > 1 ? `(${unpaidCycles} months)` : undefined}
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function bedLabelFor(rooms, bedId) {
  for (const room of rooms) {
    const bed = (room.beds || []).find((b) => b.id === bedId);
    if (bed) return bed.label;
  }
  return null;
}
