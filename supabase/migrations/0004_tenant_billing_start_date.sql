-- Lets an owner override a tenant's rent-cycle anchor independently of their
-- move-in date (e.g. a mid-month move-in with a partial first payment, after
-- which the owner wants the regular cycle to start from the 1st of the next
-- month instead of 30 days after the actual move-in date).

alter table tenants add column if not exists billing_start_date date;
