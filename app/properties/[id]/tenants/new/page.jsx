"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createTenant } from "@/lib/queries";
import { todayIso } from "@/lib/dueDate";
import GradientHeader from "@/components/GradientHeader";

export default function AddTenantPage() {
  const { id: propertyId } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    room_no: "",
    monthly_rent: "",
    phone: "",
    move_in_date: todayIso(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = form.name.trim() && form.room_no.trim() && form.monthly_rent;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await createTenant({
        property_id: propertyId,
        name: form.name.trim(),
        room_no: form.room_no.trim(),
        monthly_rent: Number(form.monthly_rent),
        phone: form.phone.trim() || null,
        move_in_date: form.move_in_date,
      });
      router.push(`/properties/${propertyId}`);
    } catch (e) {
      setError(
        e.message?.includes("tenants_active_room_unique")
          ? "Room " + form.room_no + " already has an active tenant."
          : e.message
      );
      setSaving(false);
    }
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

        <Field label="Room No. / Floor *">
          <input
            value={form.room_no}
            onChange={(e) => setForm((f) => ({ ...f, room_no: e.target.value }))}
            placeholder="e.g., 1F-102"
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
          />
        </Field>

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
