create table if not exists public.image_infos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  original_name text not null default '',
  stored_name text not null default '',
  object_key text not null,
  file_extension text not null default '',
  mime_type text not null default '',
  file_size_bytes bigint not null default 0,
  bucket_name text not null default '',
  region text not null default '',
  url text not null default '',
  etag text,
  uploaded_at timestamptz not null default timezone('utc', now()),
  constraint image_infos_file_size_bytes_check check (file_size_bytes >= 0)
);

create index if not exists image_infos_user_id_uploaded_at_idx
  on public.image_infos (user_id, uploaded_at desc, id desc);

create unique index if not exists image_infos_object_key_idx
  on public.image_infos (object_key);

alter table public.image_infos enable row level security;

drop policy if exists "image_infos_owner" on public.image_infos;
create policy "image_infos_owner"
  on public.image_infos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
