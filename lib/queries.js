import { getSupabaseClient } from "./supabaseClient";
import { billingAnchor, firstDueDate } from "./dueDate";

// Small, shared data-access helpers used across pages. Keeping them here
// (instead of duplicating supabase calls in every page) is the closest
// thing this app has to a "backend" — everything else is RLS-protected
// direct queries from the browser.

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getProfile() {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) throw error;
}

export async function getActiveProperties() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProperty(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProperty(input) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id, patch) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("properties").update(patch).eq("id", id);
  if (error) throw error;
}

export async function softDeleteProperty(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getRoomsForProperty(propertyId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*, beds(*)")
    .eq("property_id", propertyId)
    .order("room_no");
  if (error) throw error;
  return data;
}

export async function getAllRooms() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("rooms").select("*, beds(*)").order("room_no");
  if (error) throw error;
  return data;
}

// bedCount > 0 creates that many beds labeled A, B, C... (bed-wise);
// bedCount omitted/0 creates just the room (room-wise, no beds table row).
export async function createRoom({ propertyId, roomNo, bedCount = 0 }) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({ property_id: propertyId, user_id: user.id, room_no: roomNo })
    .select()
    .single();
  if (error) throw error;

  if (bedCount > 0) {
    const labels = "ABCDEFGHIJ".slice(0, bedCount).split("");
    const { error: bedsError } = await supabase.from("beds").insert(
      labels.map((label) => ({
        room_id: room.id,
        property_id: propertyId,
        user_id: user.id,
        label,
      }))
    );
    if (bedsError) throw bedsError;
  }

  return getRoomsForProperty(propertyId).then((rooms) => rooms.find((r) => r.id === room.id));
}

export async function deleteRoom(roomId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function getTenantsByProperty(propertyId, { activeOnly = true } = {}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("tenants")
    .select("*")
    .eq("property_id", propertyId)
    .order("room_no");
  if (activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAllActiveTenants() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*, property:properties(id, name, type)")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getTenant(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*, property:properties(id, name, type)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTenant(input) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("tenants")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;

  // Create their first rent cycle (30 days after move-in, or after their
  // Billing Start Date override if one was set) immediately, rather than
  // waiting for tomorrow's cron run, so a newly added tenant shows up on
  // the Payments tab right away.
  await ensurePaymentForTenant(data, firstDueDate(billingAnchor(data)));
  return data;
}

export async function moveOutTenant(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("tenants")
    .update({ status: "inactive" })
    .eq("id", id);
  if (error) throw error;
}

// General tenant edits. When `billing_start_date` is part of the patch, the
// tenant's current (not-yet-paid) cycle is realigned to the new anchor so
// the change takes effect immediately rather than waiting for the next
// cron run — that's the whole point of letting an owner override it after
// a partial first payment.
export async function updateTenant(id, patch) {
  const supabase = getSupabaseClient();
  const { data: updated, error } = await supabase
    .from("tenants")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if ("billing_start_date" in patch) {
    await realignTenantCurrentCycle(updated);
  }

  return updated;
}

async function realignTenantCurrentCycle(tenant) {
  const supabase = getSupabaseClient();
  const newDueDate = firstDueDate(billingAnchor(tenant));

  const { data: latest } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("due_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && !latest.paid_at) {
    // Their open cycle hasn't been paid yet — move it to the new anchor
    // instead of leaving a stale one sitting there.
    await supabase.from("payments").update({ due_date: newDueDate }).eq("id", latest.id);
  } else {
    // Either no cycle exists yet, or the latest one is already paid —
    // make sure the newly-anchored cycle exists.
    await ensurePaymentForTenant(tenant, newDueDate);
  }
}

async function ensurePaymentForTenant(tenant, dueDate) {
  const supabase = getSupabaseClient();
  await supabase.from("payments").upsert(
    {
      user_id: tenant.user_id,
      tenant_id: tenant.id,
      property_id: tenant.property_id,
      due_date: dueDate,
      amount_due: tenant.monthly_rent,
    },
    { onConflict: "tenant_id,due_date", ignoreDuplicates: true }
  );
}

// Every payment record the owner has, across all properties/tenants.
// Due dates are per-tenant now (not aligned to a shared calendar month),
// so pages reduce this with latestPerTenant()/oldestUnpaidPerTenant()
// below rather than filtering by a single shared month.
export async function getAllPaymentsForOwner() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, tenant:tenants(id, name, phone, room_no, status), property:properties(id, name, type)"
    )
    .order("due_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPaymentsForProperty(propertyId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, tenant:tenants(id, name, phone, room_no, status)")
    .eq("property_id", propertyId)
    .order("due_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPaymentsForTenant(tenantId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("due_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPaymentsInRange(fromDate, toDate) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, tenant:tenants(id, name), property:properties(id, name, type)"
    )
    .gte("due_date", fromDate)
    .lte("due_date", toDate);
  if (error) throw error;
  return data;
}

// One row per tenant: whichever payment has the latest due_date (their
// current/most recent rent cycle). Used for "current standing" summaries
// (dashboard, property detail) where older, already-resolved cycles
// shouldn't count.
export function latestPerTenant(payments) {
  const byTenant = new Map();
  for (const p of payments) {
    const existing = byTenant.get(p.tenant_id);
    if (!existing || new Date(p.due_date) > new Date(existing.due_date)) {
      byTenant.set(p.tenant_id, p);
    }
  }
  return [...byTenant.values()];
}

// One row per tenant: their oldest still-unpaid cycle, i.e. the one
// that's been overdue the longest. Used for Payments/At-Risk so a tenant
// who's missed several cycles shows up once, at their worst severity,
// instead of as several duplicate cards.
export function oldestUnpaidPerTenant(payments) {
  const byTenant = new Map();
  for (const p of payments) {
    const existing = byTenant.get(p.tenant_id);
    if (!existing || new Date(p.due_date) < new Date(existing.due_date)) {
      byTenant.set(p.tenant_id, p);
    }
  }
  return [...byTenant.values()];
}

export async function getUnpaidPayments() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, tenant:tenants(id, name, phone, status), property:properties(id, name)"
    )
    .is("paid_at", null)
    .order("due_date");
  if (error) throw error;
  return data;
}

export async function getRecentlyPaidPayments(sinceIso) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, tenant:tenants(id, name), property:properties(id, name)")
    .gte("paid_at", sinceIso)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function markPaymentPaid(payment) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const paidAt = new Date().toISOString();
  const { error } = await supabase
    .from("payments")
    .update({ paid_at: paidAt })
    .eq("id", payment.id);
  if (error) throw error;
  await supabase.from("payment_audit_log").insert({
    user_id: user.id,
    payment_id: payment.id,
    action: "marked_paid",
    old_value: { paid_at: payment.paid_at },
    new_value: { paid_at: paidAt },
  });
}

export async function undoPaymentPaid(payment) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("payments")
    .update({ paid_at: null })
    .eq("id", payment.id);
  if (error) throw error;
  await supabase.from("payment_audit_log").insert({
    user_id: user.id,
    payment_id: payment.id,
    action: "marked_unpaid",
    old_value: { paid_at: payment.paid_at },
    new_value: { paid_at: null },
  });
}
