alter table public.churches
  add column if not exists description text not null default '';

create or replace function public.create_church(
  p_name text,
  p_description text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_description text;
  v_church_id bigint;
begin
  v_user_id := auth.uid();
  v_name := trim(coalesce(p_name, ''));
  v_description := trim(coalesce(p_description, ''));

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_name = '' then
    raise exception 'CHURCH_NAME_REQUIRED';
  end if;

  insert into public.churches (
    name,
    description,
    created_by_user_id,
    super_admin_user_id
  )
  values (
    v_name,
    v_description,
    v_user_id,
    v_user_id
  )
  returning id into v_church_id;

  insert into public.church_memberships (
    church_id,
    user_id,
    role,
    created_by_user_id
  )
  values (
    v_church_id,
    v_user_id,
    'super_admin',
    v_user_id
  )
  on conflict (church_id, user_id) do nothing;

  perform public.sync_church_cached_fields(v_church_id);

  return v_church_id;
end;
$$;

create or replace function public.create_church(p_name text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_church(p_name, '');
end;
$$;

create or replace function public.update_church_info(
  p_church_id bigint,
  p_name text,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_name text;
  v_description text;
begin
  v_actor_user_id := auth.uid();
  v_name := trim(coalesce(p_name, ''));
  v_description := trim(coalesce(p_description, ''));

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_name = '' then
    raise exception 'CHURCH_NAME_REQUIRED';
  end if;

  if not public.is_church_super_admin(p_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.churches church
  set name = v_name,
      description = v_description
  where church.id = p_church_id;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.create_church(text) from public;
grant execute on function public.create_church(text) to authenticated;
revoke all on function public.create_church(text, text) from public;
grant execute on function public.create_church(text, text) to authenticated;
revoke all on function public.update_church_info(bigint, text, text) from public;
grant execute on function public.update_church_info(bigint, text, text) to authenticated;
