-- "Property Total Rent" is no longer entered by the owner — a property's
-- rent is now always the sum of its tenants' individual monthly_rent
-- values, computed in the app rather than stored. The column is unused.

alter table properties drop column if exists total_rent;
