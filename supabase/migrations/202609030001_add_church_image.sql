alter table public.churches
  add column if not exists image_url text;

create or replace function public.set_church_image_url(
  p_church_id bigint,
  p_image_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_church_admin(p_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.churches church
  set image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where church.id = p_church_id;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.set_church_image_url(bigint, text) from public;
grant execute on function public.set_church_image_url(bigint, text) to authenticated;

drop policy if exists "churches_update_super_admin" on public.churches;
drop policy if exists "churches_update_admins" on public.churches;
create policy "churches_update_admins"
  on public.churches
  for update
  using (public.is_church_admin(id, auth.uid()))
  with check (public.is_church_admin(id, auth.uid()));
