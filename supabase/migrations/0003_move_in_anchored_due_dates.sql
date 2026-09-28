-- Rent due dates move from "1st of the calendar month, same for every
-- tenant" to a per-tenant rolling 30-day cycle anchored to each tenant's
-- own move_in_date (due 30 days after move-in, then every 30 days after
-- that). The column is renamed to reflect that it's no longer a calendar
-- month marker.

alter table payments rename column period_month to due_date;
