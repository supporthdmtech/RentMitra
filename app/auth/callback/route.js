import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Google redirects here (via Supabase) after sign-in with a `code` param.
// Exchange it for a session (sets the auth cookies), then send the person
// wherever they need to go next.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", data.user.id)
    .single();

  if (!profile?.phone) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  const { data: properties } = await supabase.from("properties").select("id").limit(1);

  return NextResponse.redirect(
    `${origin}${properties && properties.length ? "/dashboard" : "/properties/new"}`
  );
}
