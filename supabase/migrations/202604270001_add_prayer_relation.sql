alter table public.prayers
  add column if not exists relation varchar(50) not null default '';

alter table public.church_prayers
  add column if not exists relation varchar(50) not null default '';
