-- When billing_start_date was changed multiple times while overdue cycles
-- already existed, realignTenantCurrentCycle would push a later cycle back
-- to an earlier date — creating duplicate entries like "July Rent (93 days)",
-- "July Rent (94 days)", "July Rent (95 days)" for the same tenant.
--
-- Rule: for every unpaid payment that has an earlier unpaid payment for the
-- same tenant within 5 days, it is an orphan from a mis-fired realignment.
-- Delete it, keeping only the earliest of each near-date cluster.

delete from payments
where paid_at is null
  and id in (
    select p.id
    from payments p
    where p.paid_at is null
      and exists (
        select 1 from payments earlier
        where earlier.tenant_id = p.tenant_id
          and earlier.paid_at     is null
          and earlier.id         <> p.id
          and earlier.due_date::date < p.due_date::date
          and (p.due_date::date - earlier.due_date::date) <= 5
      )
  );
