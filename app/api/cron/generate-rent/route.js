import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { currentPeriodMonth } from "@/lib/dueDate";

// Called once a day by Vercel Cron (see vercel.json). Idempotent: running it
// twice in the same month just no-ops on the second run thanks to the
// (tenant_id, period_month) unique constraint.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  const periodMonth = currentPeriodMonth();

  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, user_id, property_id, monthly_rent")
    .eq("status", "active");

  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 });
  }

  if (!tenants.length) {
    return NextResponse.json({ created: 0 });
  }

  const rows = tenants.map((t) => ({
    user_id: t.user_id,
    tenant_id: t.id,
    property_id: t.property_id,
    period_month: periodMonth,
    amount_due: t.monthly_rent,
  }));

  const { error: upsertError, count } = await supabase
    .from("payments")
    .upsert(rows, { onConflict: "tenant_id,period_month", ignoreDuplicates: true, count: "exact" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ attempted: rows.length, created: count ?? null });
}
