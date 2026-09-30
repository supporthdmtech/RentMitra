"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createTenant, getProperty, getRoomsForProperty, getTenantsByProperty } from "@/lib/queries";
import { todayIso } from "@/lib/dueDate";
import { effectiveBillingMode } from "@/lib/rooms";
import GradientHeader from "@/components/GradientHeader";

export default function AddTenantPage() {
  const { id: propertyId } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    room_no: "",
    room_id: "",
    bed_id: "",
    monthly_rent: "",
    phone: "",
    move_in_date: todayIso(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProperty(propertyId), getRoomsForProperty(propertyId), getTenantsByProperty(propertyId)]).then(
      ([propertyData, roomData, tenantData]) => {
        setProperty(propertyData);
        setRooms(roomData);
        setTenants(tenantData);
        setLoading(false);
      }
    );
  }, [propertyId]);

  const mode = property ? effectiveBillingMode(property) : null;
  const isRental = !mode;

  const occupiedRoomIds = useMemo(
    () => new Set(tenants.filter((t) => t.room_id).map((t) => t.room_id)),
    [tenants]
  );
  const occupiedBedIds = useMemo(
    () => new Set(tenants.filter((t) => t.bed_id).map((t) => t.bed_id)),
    [tenants]
  );

  const selectedRoom = rooms.find((r) => r.id === form.room_id);
  const vacantBeds = selectedRoom ? (selectedRoom.beds || []).filter((b) => !occupiedBedIds.has(b.id)) : [];

  const valid = isRental
    ? form.name.trim() && form.room_no.trim() && form.monthly_rent
    : form.name.trim() &&
      form.monthly_rent &&
      form.room_id &&
      (mode !== "bed" || form.bed_id);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await createTenant({
        property_id: propertyId,
        name: form.name.trim(),
        room_no: isRental ? form.room_no.trim() : selectedRoom.room_no,
        room_id: isRental ? null : form.room_id,
        bed_id: isRental || mode !== "bed" ? null : form.bed_id,
        monthly_rent: Number(form.monthly_rent),
        phone: form.phone.trim() || null,
        move_in_date: form.move_in_date,
      });
      router.push(`/properties/${propertyId}`);
    } catch (e) {
      setError(
        e.message?.includes("tenants_active_")
          ? "That room/bed already has an active tenant."
          : e.message
      );
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  if (!isRental && rooms.length === 0) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white">
        <GradientHeader title="Add Tenant" gradient="orange" backHref={`/properties/${propertyId}`} />
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-500">
            This property has no rooms yet — add one first.
          </p>
          <Link
            href={`/properties/${propertyId}/rooms`}
            className="font-heading block w-full rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 py-4 text-center font-bold text-white"
          >
            Manage Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <GradientHeader title="Add Tenant" gradient="orange" backHref={`/properties/${propertyId}`} />

      <div className="p-6">
        <Field label="Tenant Name *">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Raj Kumar"
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
          />
        </Field>

        {isRental ? (
          <Field label="Room No. / Floor *">
            <input
              value={form.room_no}
              onChange={(e) => setForm((f) => ({ ...f, room_no: e.target.value }))}
              placeholder="e.g., 1F-102"
              className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
            />
          </Field>
        ) : (
          <>
            <Field label="Room *">
              <select
                value={form.room_id}
                onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value, bed_id: "" }))}
                className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
              >
                <option value="">Select a room</option>
                {rooms.map((room) => {
                  const full =
                    mode === "room"
                      ? occupiedRoomIds.has(room.id)
                      : (room.beds || []).every((b) => occupiedBedIds.has(b.id));
                  return (
                    <option key={room.id} value={room.id} disabled={mode === "room" && full}>
                      Room {room.room_no}
                      {mode === "room" && full ? " (occupied)" : ""}
                      {mode === "bed" ? ` (${(room.beds || []).length - (room.beds || []).filter((b) => occupiedBedIds.has(b.id)).length} vacant beds)` : ""}
                    </option>
                  );
                })}
              </select>
            </Field>

            {mode === "bed" && form.room_id ? (
              <Field label="Bed *">
                <select
                  value={form.bed_id}
                  onChange={(e) => setForm((f) => ({ ...f, bed_id: e.target.value }))}
                  className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
                >
                  <option value="">Select a vacant bed</option>
                  {vacantBeds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      Bed {bed.label}
                    </option>
                  ))}
                </select>
                {vacantBeds.length === 0 ? (
                  <p className="mt-1 text-[11px] text-red-500">No vacant beds in this room.</p>
                ) : null}
              </Field>
            ) : null}
          </>
        )}

        <Field label="Monthly Rent (₹) *">
          <input
            type="number"
            value={form.monthly_rent}
            onChange={(e) => setForm((f) => ({ ...f, monthly_rent: e.target.value }))}
            placeholder="25,000"
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
          />
        </Field>

        <Field label="Move-In Date *">
          <input
            type="date"
            value={form.move_in_date}
            onChange={(e) => setForm((f) => ({ ...f, move_in_date: e.target.value }))}
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
          />
        </Field>

        <Field label="Phone (Optional)">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
          />
        </Field>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <button
          disabled={!valid || saving}
          onClick={handleSave}
          className="font-heading w-full rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 py-4 font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Tenant"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-xs font-semibold">{label}</label>
      {children}
    </div>
  );
}
