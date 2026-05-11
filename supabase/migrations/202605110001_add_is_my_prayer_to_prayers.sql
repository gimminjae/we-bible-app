alter table public.prayers
  add column if not exists is_my_prayer boolean not null default false;
