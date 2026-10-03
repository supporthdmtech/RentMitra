-- Billing mode moves from the property level to the room level. Real PGs
-- (and occasionally hostels) mix private rooms with shared/dorm rooms in
-- the same building, so a single bed-wise/room-wise choice per property
-- was too rigid — now each room picks its own.

alter table rooms add column billing_mode text check (billing_mode in ('bed', 'room'));

-- Backfill: every existing room inherits whatever its property was set to
-- (falling back to 'room' for any that somehow had none).
update rooms r
set billing_mode = coalesce(
  (select p.billing_mode from properties p where p.id = r.property_id),
  'room'
)
where r.billing_mode is null;

alter table rooms alter column billing_mode set not null;
alter table rooms alter column billing_mode set default 'room';

alter table properties drop column if exists billing_mode;
