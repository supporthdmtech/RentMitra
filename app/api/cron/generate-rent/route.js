import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { billingAnchor, firstDueDate, nextDueDate, todayIso } from "@/lib/dueDate";

// Called once a day by Vercel Cron (see vercel.json). Each tenant's rent
// cycles are independent (due 30 days after move-in, then every 30 days
// after that), so this walks each active tenant's own payment history
// rather than generating one shared record for everyone.
//
// For a tenant with no payments yet, it creates their first cycle
// (move_in_date + 30). For a tenant whose latest cycle's due date has
// already arrived, it creates the next one (that due date + 30) — one
// cycle per run, so if the app hasn't been checked in a while, running
// daily naturally catches up one missed cycle per day rather than trying
// to backfill everything at once.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  const today = todayIso();

  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, user_id, property_id, monthly_rent, move_in_date, billing_start_date")
    .eq("status", "active");

  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 });
  }

  let created = 0;
  const errors = [];

  for (const tenant of tenants) {
    const { data: latest, error: latestError } = await supabase
      .from("payments")
      .select("due_date")
      .eq("tenant_id", tenant.id)
      .order("due_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      errors.push({ tenant_id: tenant.id, error: latestError.message });
      continue;
    }

    const dueDate = latest ? nextDueDate(latest.due_date) : firstDueDate(billingAnchor(tenant));

    // Only create the next cycle once its due date has actually arrived —
    // don't generate cycles ahead of time.
    if (latest && dueDate > today) continue;

    const { error: insertError } = await supabase.from("payments").upsert(
      {
        user_id: tenant.user_id,
        tenant_id: tenant.id,
        property_id: tenant.property_id,
        due_date: dueDate,
        amount_due: tenant.monthly_rent,
      },
      { onConflict: "tenant_id,due_date", ignoreDuplicates: true }
    );

    if (insertError) {
      errors.push({ tenant_id: tenant.id, error: insertError.message });
    } else {
      created += 1;
    }
  }

  return NextResponse.json({ tenants: tenants.length, created, errors });
}
