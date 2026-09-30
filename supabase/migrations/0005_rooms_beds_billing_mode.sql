-- Introduces real Room and Bed records so PG/Hostel occupancy and billing
-- can be tracked per-bed or per-room instead of a free-text room_no string.
-- Rental properties are unaffected — they keep total_units + free-text room.

alter table properties drop constraint properties_type_check;
alter table properties add constraint properties_type_check
  check (type in ('rental', 'pg', 'hostel'));

-- Only meaningful when type = 'pg'. Hostel is always bed-wise (handled in
-- application code via lib/rooms.js, not stored here) and rental has no
-- rooms/beds concept at all.
alter table properties add column billing_mode text
  check (billing_mode in ('bed', 'room'));

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  room_no text not null,
  created_at timestamptz not null default now()
);
-- No stored "capacity" column: for bed-wise properties, capacity is just
-- count(beds) in that room; for room-wise, a room's capacity is implicitly
-- 1 (the room itself is the billable unit, no beds table involved).

create index rooms_property_id_idx on rooms (property_id);

alter table rooms enable row level security;

create policy "rooms_all_own" on rooms for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null, -- "A", "B", "C"...
  created_at timestamptz not null default now(),
  unique (room_id, label)
);

create index beds_room_id_idx on beds (room_id);
create index beds_property_id_idx on beds (property_id);

alter table beds enable row level security;

create policy "beds_all_own" on beds for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table tenants add column room_id uuid references rooms (id) on delete restrict;
alter table tenants add column bed_id uuid references beds (id) on delete restrict;
-- room_id is set for pg/hostel tenants (which room they're in), and its
-- room's room_no is also copied into tenants.room_no (kept NOT NULL) so
-- every existing room_no-reading display/query keeps working unchanged.
-- bed_id is additionally set only for bed-wise properties (which bed
-- within that room). Both stay null for rental tenants, which still use
-- the free-text room_no field exactly as before.

-- The old "(property_id, room_no) unique while active" rule assumed one
-- active tenant per room_no — wrong for bed-wise, where several tenants
-- legitimately share a room (different beds). Replace it with three
-- narrower rules: rental still dedupes on room_no; room-wise dedupes on
-- room_id (bed_id null); bed-wise dedupes on bed_id.
drop index if exists tenants_active_room_unique;

create unique index tenants_active_room_no_unique
  on tenants (property_id, room_no)
  where status = 'active' and room_id is null; -- rental only

create unique index tenants_active_room_only_unique
  on tenants (room_id)
  where status = 'active' and bed_id is null; -- room-wise: one active tenant per room

create unique index tenants_active_bed_unique
  on tenants (bed_id)
  where status = 'active'; -- bed-wise: one active tenant per bed

-- Backfill: any property created before this migration is 'pg' by
-- definition (hostel didn't exist yet). Default it to room-wise billing
-- (the closest match to how it was already being used — one room_no per
-- tenant, no bed concept) and create a real Room per distinct room_no its
-- tenants have ever used, linking those tenants to it.
do $$
declare
  prop record;
  distinct_room record;
  new_room_id uuid;
begin
  for prop in select id, user_id from properties where type = 'pg' loop
    update properties set billing_mode = 'room' where id = prop.id;

    for distinct_room in
      select distinct room_no from tenants where property_id = prop.id
    loop
      insert into rooms (property_id, user_id, room_no)
      values (prop.id, prop.user_id, distinct_room.room_no)
      returning id into new_room_id;

      update tenants set room_id = new_room_id
      where property_id = prop.id and room_no = distinct_room.room_no;
    end loop;
  end loop;
end $$;
