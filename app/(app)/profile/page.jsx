"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getActiveProperties,
  getAllActiveTenants,
  getProfile,
  updateProfile,
} from "@/lib/queries";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { downloadCsv } from "@/lib/csv";

const REMINDER_OPTIONS = [1, 3, 5, 7];
const DELETE_CONFIRM_WORD = "DELETE";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [deleteStep, setDeleteStep] = useState("idle"); // idle | confirm
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  async function save(patch) {
    setProfile((prev) => ({ ...prev, ...patch }));
    await updateProfile(patch);
  }

  async function handleLogout() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCopyUpi() {
    if (!profile?.upi_id) return;
    await navigator.clipboard.writeText(profile.upi_id);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  }

  async function handleExportData() {
    const [properties, tenants] = await Promise.all([getActiveProperties(), getAllActiveTenants()]);
    downloadCsv(
      "rentmitra-properties.csv",
      properties.map((p) => ({
        name: p.name,
        type: p.type,
        address: p.address,
        total_rent: p.total_rent,
        total_units: p.total_units,
      }))
    );
    downloadCsv(
      "rentmitra-tenants.csv",
      tenants.map((t) => ({
        name: t.name,
        property: t.property?.name,
        room_no: t.room_no,
        monthly_rent: t.monthly_rent,
        move_in_date: t.move_in_date,
        status: t.status,
      }))
    );
  }

  async function handleConfirmDelete() {
    await updateProfile({ deleted_at: new Date().toISOString() });
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center gap-3.5 bg-gradient-to-br from-blue-600 to-purple-600 px-5 pb-6 pt-5 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white font-heading text-xl font-extrabold text-indigo-600">
          {profile?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (profile?.full_name || "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          {editingName ? (
            <input
              autoFocus
              defaultValue={profile?.full_name || ""}
              onBlur={(e) => {
                save({ full_name: e.target.value });
                setEditingName(false);
              }}
              className="w-full rounded bg-white/20 px-2 py-1 font-heading text-lg font-bold text-white placeholder-white/60"
            />
          ) : (
            <div className="font-heading text-lg font-bold">{profile?.full_name || "Add your name"}</div>
          )}
          <div className="text-xs opacity-90">{profile?.email}</div>
        </div>
        <button
          onClick={() => setEditingName(true)}
          className="rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-bold"
        >
          ✎ Edit
        </button>
      </div>

      <div className="flex flex-col gap-4 bg-gray-50 p-5">
        <div className="rounded-xl border border-indigo-100 bg-white p-3.5">
          <div className="text-[11px] font-semibold text-gray-500">Your Phone Number</div>
          <div className="mt-1 text-[10px] text-gray-400">Used for WhatsApp reminders &amp; calls, not for login</div>
          {editingPhone ? (
            <input
              autoFocus
              defaultValue={profile?.phone || ""}
              onBlur={(e) => {
                save({ phone: e.target.value });
                setEditingPhone(false);
              }}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm"
            />
          ) : (
            <div className="mt-1 text-sm font-bold" onClick={() => setEditingPhone(true)}>
              {profile?.phone || "Tap to add"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-white p-3.5">
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-500">Your UPI ID (shared with tenants)</div>
            {editingUpi ? (
              <input
                autoFocus
                defaultValue={profile?.upi_id || ""}
                onBlur={(e) => {
                  save({ upi_id: e.target.value });
                  setEditingUpi(false);
                }}
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm"
              />
            ) : (
              <div className="text-sm font-bold" onClick={() => setEditingUpi(true)}>
                {profile?.upi_id || "Tap to add"}
              </div>
            )}
          </div>
          <button onClick={handleCopyUpi} className="rounded-lg bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-600">
            {copyLabel}
          </button>
        </div>

        <Section title="REMINDERS">
          <Row icon="⏰" label="Reminder timing">
            <select
              value={profile?.reminder_days_before}
              onChange={(e) => save({ reminder_days_before: Number(e.target.value) })}
              className="bg-transparent text-xs text-gray-500"
            >
              {REMINDER_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} days before
                </option>
              ))}
            </select>
          </Row>
          <Row icon="💬" label="WhatsApp message template" onClick={() => setEditingTemplate((v) => !v)} chevron />
          {editingTemplate ? (
            <div className="border-t border-gray-100 p-3">
              <textarea
                defaultValue={profile?.whatsapp_template}
                onBlur={(e) => save({ whatsapp_template: e.target.value })}
                rows={4}
                className="w-full rounded border border-gray-200 p-2 text-xs"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Placeholders: {"{name} {amount} {due_date} {upi}"}
              </p>
            </div>
          ) : null}
        </Section>

        <Section title="APP">
          <Row icon="🌐" label="Language">
            <select
              value={profile?.language}
              onChange={(e) => save({ language: e.target.value })}
              className="bg-transparent text-xs text-gray-500"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (coming soon)</option>
            </select>
          </Row>
          <Row icon="📤" label="Export all data" caption="CSV" onClick={handleExportData} chevron />
        </Section>

        <Section title="SUPPORT">
          <Row icon="❓" label="Help & support" chevron />
          <Row icon="🔒" label="Privacy policy" chevron />
        </Section>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <Row icon="↪" label="Logout" onClick={handleLogout} chevron />
          <Row icon="⚠" label="Delete account" danger onClick={() => setDeleteStep("confirm")} chevron />
        </div>

        {deleteStep === "confirm" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
            <p className="mb-3 text-red-700">
              This deletes your account and all data. It can be recovered within 30 days by contacting
              support. Type <strong>{DELETE_CONFIRM_WORD}</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="mb-3 w-full rounded border border-red-200 px-3 py-2 text-sm"
              placeholder={DELETE_CONFIRM_WORD}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteInput !== DELETE_CONFIRM_WORD}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => {
                  setDeleteStep("idle");
                  setDeleteInput("");
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="text-center text-[11px] text-gray-400">RentMitra v1.0.0</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-2 ml-1 text-[11px] font-bold tracking-wide text-gray-400">{title}</div>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">{children}</div>
    </div>
  );
}

function Row({ icon, label, caption, chevron, danger, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 border-b border-gray-50 px-3.5 py-3 last:border-b-0 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm">{icon}</div>
      <div className={`flex-1 text-sm font-semibold ${danger ? "text-red-600" : ""}`}>{label}</div>
      {caption ? <div className="text-xs text-gray-500">{caption}</div> : null}
      {children}
      {chevron ? <div className="text-gray-300">›</div> : null}
    </div>
  );
}
