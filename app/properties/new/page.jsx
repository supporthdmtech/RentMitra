"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProperty, getProperty, updateProperty } from "@/lib/queries";
import GradientHeader from "@/components/GradientHeader";

function AddPropertyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "rental",
    billing_mode: "room",
    name: "",
    address: "",
    total_units: "1",
  });

  useEffect(() => {
    if (!isEdit) return;
    getProperty(editId).then((p) => {
      setForm({
        type: p.type,
        billing_mode: p.billing_mode || "room",
        name: p.name,
        address: p.address,
        total_units: String(p.total_units),
      });
      setLoading(false);
    });
  }, [editId, isEdit]);

  const isRental = form.type === "rental";
  const hasBillingMode = form.type === "pg" || form.type === "hostel";
  const step1Valid =
    form.name.trim() && form.address.trim() && (!isRental || Number(form.total_units) > 0);

  async function handleSave() {
    setSaving(true);
    setError("");
    const payload = {
      type: form.type,
      name: form.name.trim(),
      address: form.address.trim(),
      total_units: isRental ? Number(form.total_units) : 1,
      billing_mode: hasBillingMode ? form.billing_mode : null,
    };
    try {
      if (isEdit) {
        await updateProperty(editId, payload);
        router.push(`/properties/${editId}`);
      } else {
        const property = await createProperty(payload);
        // PG/Hostel need rooms (and beds, if bed-wise) set up before a
        // tenant can be added — send the owner there first.
        router.push(isRental ? `/properties/${property.id}` : `/properties/${property.id}/rooms`);
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <GradientHeader
        title={isEdit ? "Edit Property" : "Add Property"}
        subtitle={step === 1 ? "Step 1 of 2: Property Details" : "Step 2 of 2: Confirm"}
        gradient="purple"
        backHref={step === 1 ? "/dashboard" : undefined}
      />

      <div className="p-6">
        {step === 1 ? (
          <>
            <div className="mb-6">
              <div className="font-heading mb-3 text-[13px] font-bold">What type of property?</div>
              <div className="grid grid-cols-3 gap-2.5">
                <TypeButton
                  active={form.type === "rental"}
                  onClick={() => setForm((f) => ({ ...f, type: "rental", total_units: "1" }))}
                  disabled={isEdit}
                  emoji="🏘️"
                  label="Rental"
                />
                <TypeButton
                  active={form.type === "pg"}
                  onClick={() => setForm((f) => ({ ...f, type: "pg" }))}
                  disabled={isEdit}
                  emoji="🏢"
                  label="PG"
                />
                <TypeButton
                  active={form.type === "hostel"}
                  onClick={() => setForm((f) => ({ ...f, type: "hostel" }))}
                  disabled={isEdit}
                  emoji="🏫"
                  label="Hostel"
                />
              </div>
              {isEdit ? (
                <p className="mt-2 text-[11px] text-gray-400">Property type can&apos;t be changed once tenants exist.</p>
              ) : null}
            </div>

            {hasBillingMode ? (
              <div className="mb-6">
                <div className="font-heading mb-3 text-[13px] font-bold">How is it billed?</div>
                <div className="grid grid-cols-2 gap-3">
                  <TypeButton
                    active={form.billing_mode === "bed"}
                    onClick={() => setForm((f) => ({ ...f, billing_mode: "bed" }))}
                    disabled={isEdit}
                    emoji="🛏️"
                    label="Bed-wise"
                  />
                  <TypeButton
                    active={form.billing_mode === "room"}
                    onClick={() => setForm((f) => ({ ...f, billing_mode: "room" }))}
                    disabled={isEdit}
                    emoji="🚪"
                    label="Room-wise"
                  />
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Bed-wise: each bed in a shared room is billed separately. Room-wise: a private
                  room is billed as one unit (e.g. two friends splitting one room).
                  {isEdit ? " Can't be changed once rooms exist." : ""}
                </p>
              </div>
            ) : null}

            <Field label="Property Name *">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Vihar Nagar 2-BHK"
                className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
              />
            </Field>

            {isRental ? (
              <Field label="Number of Units *">
                <input
                  type="number"
                  min={1}
                  value={form.total_units}
                  onChange={(e) => setForm((f) => ({ ...f, total_units: e.target.value }))}
                  className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
                />
              </Field>
            ) : (
              <p className="mb-5 text-[11px] text-gray-400">
                Rent is calculated from whatever you set per tenant once you add them — no need
                to enter a total here.
              </p>
            )}

            <Field label="Address *">
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
                className="w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
              />
            </Field>

            <button
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="font-heading w-full rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 py-4 font-bold text-white disabled:opacity-50"
            >
              Continue →
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-gray-100 p-4">
              <SummaryRow
                label="Type"
                value={form.type === "rental" ? "Rental" : form.type === "pg" ? "PG" : "Hostel"}
              />
              {hasBillingMode ? (
                <SummaryRow label="Billing" value={form.billing_mode === "bed" ? "Bed-wise" : "Room-wise"} />
              ) : null}
              <SummaryRow label="Name" value={form.name} />
              {isRental ? <SummaryRow label="Units" value={form.total_units} /> : null}
              <SummaryRow label="Address" value={form.address} last />
            </div>

            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="font-heading flex-1 rounded-xl border-[1.5px] border-gray-200 py-4 font-bold text-gray-600"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="font-heading flex-1 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 py-4 font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Property"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TypeButton({ active, onClick, disabled, emoji, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-[2.5px] p-4 text-sm font-bold disabled:opacity-60 ${
        active ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500"
      }`}
    >
      {emoji}
      <br />
      {label}
    </button>
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

function SummaryRow({ label, value, last }) {
  return (
    <div className={`flex justify-between py-2 text-sm ${last ? "" : "border-b border-gray-50"}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense fallback={null}>
      <AddPropertyForm />
    </Suspense>
  );
}
