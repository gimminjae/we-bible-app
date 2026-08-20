alter table public.churches
  add column if not exists shared_plan_ranking_public boolean not null default true;

alter table public.churches
  add column if not exists shared_plan_progress_public boolean not null default true;

create or replace function public.update_church_info(
  p_church_id bigint,
  p_name text,
  p_description text,
  p_shared_plan_ranking_public boolean,
  p_shared_plan_progress_public boolean
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
      description = v_description,
      shared_plan_ranking_public = coalesce(p_shared_plan_ranking_public, true),
      shared_plan_progress_public = coalesce(p_shared_plan_progress_public, true)
  where church.id = p_church_id;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;
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
begin
  perform public.update_church_info(
    p_church_id,
    p_name,
    p_description,
    coalesce(
      (select church.shared_plan_ranking_public from public.churches church where church.id = p_church_id),
      true
    ),
    coalesce(
      (select church.shared_plan_progress_public from public.churches church where church.id = p_church_id),
      true
    )
  );
end;
$$;

revoke all on function public.update_church_info(bigint, text, text) from public;
grant execute on function public.update_church_info(bigint, text, text) to authenticated;

revoke all on function public.update_church_info(bigint, text, text, boolean, boolean) from public;
grant execute on function public.update_church_info(bigint, text, text, boolean, boolean) to authenticated;
