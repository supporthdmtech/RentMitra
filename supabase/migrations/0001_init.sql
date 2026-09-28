-- RentMitra V1 schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) once the project exists.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, keyed by auth.uid()
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  upi_id text,
  photo_url text,
  reminder_days_before smallint not null default 3
    check (reminder_days_before in (1, 3, 5, 7)),
  whatsapp_template text not null default
    'Hi {name}, this is a reminder that your rent of {amount} was due on {due_date}. Please pay to UPI ID {upi}. Thank you!',
  language text not null default 'en' check (language in ('en', 'hi')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());

-- Auto-create a profile row the first time someone signs up.
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('rental', 'pg')),
  name text not null,
  address text not null,
  total_rent numeric(10, 2) not null default 0,
  -- Units for "rental" (usually 1), rooms for "pg". Needed for the
  -- Occupancy screen's occupied/total math — tenant rows alone can't tell
  -- us how many *vacant* slots exist.
  total_units smallint not null default 1 check (total_units > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_user_id_idx on properties (user_id) where deleted_at is null;

alter table properties enable row level security;

create policy "properties_all_own" on properties for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  phone text,
  room_no text not null,
  monthly_rent numeric(10, 2) not null,
  move_in_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A room number can only be held by one *active* tenant at a time;
-- it's free to reuse once that tenant moves out.
create unique index tenants_active_room_unique
  on tenants (property_id, room_no)
  where status = 'active';

create index tenants_user_id_idx on tenants (user_id);
create index tenants_property_id_idx on tenants (property_id);

alter table tenants enable row level security;

create policy "tenants_all_own" on tenants for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- payments — one row per tenant per month
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  period_month date not null, -- always the 1st of the month; this IS the due date
  amount_due numeric(10, 2) not null,
  paid_at timestamptz, -- null = unpaid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, period_month)
);

create index payments_user_id_idx on payments (user_id);
create index payments_property_id_idx on payments (property_id);
create index payments_tenant_id_idx on payments (tenant_id);
create index payments_period_month_idx on payments (period_month);

alter table payments enable row level security;

create policy "payments_all_own" on payments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- payment_audit_log — every mark-paid / undo / amount edit
-- ---------------------------------------------------------------------------
create table payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payment_id uuid not null references payments (id) on delete cascade,
  action text not null check (action in ('marked_paid', 'marked_unpaid', 'amount_edited')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index payment_audit_log_payment_id_idx on payment_audit_log (payment_id);

alter table payment_audit_log enable row level security;

create policy "payment_audit_log_all_own" on payment_audit_log for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket for profile photos (run once)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_read_all"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile_photos_write_own"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and owner = auth.uid());

create policy "profile_photos_update_own"
  on storage.objects for update
  using (bucket_id = 'profile-photos' and owner = auth.uid());

create policy "profile_photos_delete_own"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and owner = auth.uid());
