"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveProperties, getProfile, updateProfile } from "@/lib/queries";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfile().then((p) => {
      setName(p.full_name || "");
      setLoading(false);
    });
  }, []);

  const digitsOnly = phone.replace(/\D/g, "");
  const valid = name.trim() && digitsOnly.length === 10;

  async function handleContinue() {
    setSaving(true);
    setError("");
    try {
      await updateProfile({ full_name: name.trim(), phone: `+91${digitsOnly}` });
      const properties = await getActiveProperties();
      router.push(properties.length ? "/dashboard" : "/properties/new");
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-6 py-10 text-center text-white">
        <div className="font-heading text-2xl font-bold">Just one more thing</div>
        <p className="mt-2 text-sm opacity-90">
          Your phone number is used for WhatsApp reminders and calling tenants — never for login.
        </p>
      </div>

      <div className="flex-1 px-6 py-8">
        <label className="mb-2 block text-xs font-semibold">Your Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rakesh Sharma"
          className="mb-5 w-full rounded-lg border-[1.5px] border-gray-200 px-3.5 py-3 text-sm"
        />

        <label className="mb-2 block text-xs font-semibold">Your Mobile Number *</label>
        <div className="mb-6 flex gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold">
            🇮🇳 +91
          </div>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-base font-semibold tracking-wide"
          />
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <button
          disabled={!valid || saving}
          onClick={handleContinue}
          className="font-heading w-full rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 py-4 font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
