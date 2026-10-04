-- Deleting a property never actually deactivated its tenants (a bug in the
-- app code, now fixed) — so tenants under an already-deleted property are
-- still sitting there marked 'active', showing up in Payments/At-Risk/
-- Dashboard as if nothing happened. One-time backfill to correct that;
-- going forward, softDeleteProperty() does this automatically.

update tenants
set status = 'inactive'
where status = 'active'
  and property_id in (select id from properties where deleted_at is not null);
