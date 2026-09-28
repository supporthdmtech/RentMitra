-- Switches auth from phone OTP to Google sign-in. The owner's phone number
-- is now just a profile field (for WhatsApp/calls), not an auth identifier,
-- so it needs to live in `profiles` instead of coming from auth.users.phone.
-- Run this after 0001_init.sql on a project that already has it applied.

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists email text;

-- Prefill name/photo/email from whatever the provider (Google) hands back,
-- so onboarding only has to ask for the phone number.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, photo_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;
