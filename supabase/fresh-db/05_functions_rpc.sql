-- Fresh DB bootstrap
-- Kind: RPC / app entry functions

begin;

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

create or replace function public.set_team_leader(
  p_team_id bigint,
  p_leader_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_church_id bigint;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select team.church_id
  into v_church_id
  from public.teams team
  where team.id = p_team_id;

  if v_church_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not public.is_church_admin(v_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  if p_leader_user_id is not null and not exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = v_church_id
      and membership.user_id = p_leader_user_id
      and membership.team_id = p_team_id
  ) then
    raise exception 'TEAM_LEADER_MUST_BE_TEAM_MEMBER';
  end if;

  update public.teams team
  set leader_user_id = p_leader_user_id
  where team.id = p_team_id;
end;
$$;

create or replace function public.set_church_member_team(
  p_church_id bigint,
  p_target_user_id uuid,
  p_team_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_target_role text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_actor_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = v_actor_user_id;

  if v_actor_role is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select membership.role
  into v_target_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'CHURCH_MEMBER_NOT_FOUND';
  end if;

  if p_team_id is not null and not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and team.church_id = p_church_id
  ) then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not (
    v_actor_role = 'super_admin'
    or (v_actor_role = 'deputy_admin' and v_target_role = 'member')
  ) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.church_memberships membership
  set team_id = p_team_id
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;
end;
$$;

create or replace function public.remove_church_member(
  p_church_id bigint,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_target_role text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_actor_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = v_actor_user_id;

  select membership.role
  into v_target_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'CHURCH_MEMBER_NOT_FOUND';
  end if;

  if v_actor_user_id = p_target_user_id then
    if v_target_role = 'super_admin' then
      raise exception 'SUPER_ADMIN_CANNOT_LEAVE';
    end if;
  elsif not (
    v_actor_role = 'super_admin'
    or (v_actor_role = 'deputy_admin' and v_target_role = 'member')
  ) then
    raise exception 'PERMISSION_DENIED';
  elsif v_target_role = 'super_admin' then
    raise exception 'SUPER_ADMIN_CANNOT_BE_REMOVED';
  end if;

  delete from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;
end;
$$;

create or replace function public.transfer_church_super_admin(
  p_church_id bigint,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_current_super_admin_user_id uuid;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select super_admin_user_id
  into v_current_super_admin_user_id
  from public.churches
  where id = p_church_id
  for update;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;

  if v_current_super_admin_user_id is distinct from v_actor then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;

  if p_target_user_id = v_actor then
    raise exception 'TARGET_USER_INVALID';
  end if;

  perform 1
  from public.church_memberships
  where church_id = p_church_id
    and user_id = p_target_user_id;

  if not found then
    raise exception 'TARGET_MEMBER_NOT_FOUND';
  end if;

  update public.church_memberships
  set role = 'member',
      updated_at = now()
  where church_id = p_church_id
    and user_id = v_actor;

  update public.church_memberships
  set role = 'super_admin',
      updated_at = now()
  where church_id = p_church_id
    and user_id = p_target_user_id;

  update public.churches
  set super_admin_user_id = p_target_user_id,
      created_by_user_id = p_target_user_id,
      deputy_admin_user_ids = public._clean_deputy_admin_user_ids(
        deputy_admin_user_ids,
        array[v_actor::text, p_target_user_id::text]
      )
  where id = p_church_id;
end;
$$;

create or replace function public.delete_church_as_super_admin(p_church_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_super_admin_user_id uuid;
  v_other_member_count bigint;
  v_plan_ids bigint[];
  v_prayer_ids bigint[];
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select super_admin_user_id
  into v_super_admin_user_id
  from public.churches
  where id = p_church_id
  for update;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;

  if v_super_admin_user_id is distinct from v_actor then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;

  select count(*)
  into v_other_member_count
  from public.church_memberships
  where church_id = p_church_id
    and user_id <> v_actor;

  if v_other_member_count > 0 then
    raise exception 'CHURCH_HAS_OTHER_MEMBERS';
  end if;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_prayer_ids
  from public.church_prayers
  where church_id = p_church_id;

  if cardinality(v_prayer_ids) > 0 then
    delete from public.church_prayer_contents
    where prayer_id = any(v_prayer_ids);
  end if;

  delete from public.church_prayers
  where church_id = p_church_id;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_plan_ids
  from public.plans
  where church_id = p_church_id;

  if cardinality(v_plan_ids) > 0 then
    delete from public.plan_progresses
    where plan_id = any(v_plan_ids);
  end if;

  delete from public.plans
  where church_id = p_church_id;

  delete from public.church_join_requests
  where church_id = p_church_id;

  delete from public.church_memberships
  where church_id = p_church_id;

  delete from public.teams
  where church_id = p_church_id;

  delete from public.churches
  where id = p_church_id;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_super_admin_church_count bigint;
  v_membership_church_ids bigint[];
  v_personal_plan_ids bigint[];
  v_personal_prayer_ids bigint[];
  v_shared_prayer_ids bigint[];
  v_church_id bigint;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select count(*)
  into v_super_admin_church_count
  from public.church_memberships
  where user_id = v_actor
    and role = 'super_admin';

  if v_super_admin_church_count > 0 then
    raise exception 'ACCOUNT_DELETE_HAS_SUPER_ADMIN_CHURCH';
  end if;

  select coalesce(array_agg(distinct church_id), array[]::bigint[])
  into v_membership_church_ids
  from public.church_memberships
  where user_id = v_actor;

  delete from public.bible_state
  where user_id = v_actor;

  delete from public.favorite_verses
  where user_id = v_actor;

  delete from public.memo_verses
  where user_id = v_actor;

  delete from public.memos
  where user_id = v_actor;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_personal_prayer_ids
  from public.prayers
  where user_id = v_actor;

  if cardinality(v_personal_prayer_ids) > 0 then
    delete from public.prayer_contents
    where prayer_id = any(v_personal_prayer_ids);
  end if;

  delete from public.prayers
  where user_id = v_actor;

  delete from public.bible_grass
  where user_id = v_actor;

  delete from public.plan_progresses
  where user_id = v_actor;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_personal_plan_ids
  from public.plans
  where user_id = v_actor
    and church_id is null;

  if cardinality(v_personal_plan_ids) > 0 then
    delete from public.plan_progresses
    where plan_id = any(v_personal_plan_ids);
  end if;

  delete from public.plans
  where user_id = v_actor
    and church_id is null;

  update public.plans as plans
  set user_id = churches.super_admin_user_id
  from public.churches as churches
  where plans.user_id = v_actor
    and plans.church_id is not null
    and churches.id = plans.church_id
    and churches.super_admin_user_id is not null
    and churches.super_admin_user_id is distinct from v_actor;

  update public.teams as teams
  set created_by_user_id = churches.super_admin_user_id
  from public.churches as churches
  where teams.created_by_user_id = v_actor
    and churches.id = teams.church_id
    and churches.super_admin_user_id is not null
    and churches.super_admin_user_id is distinct from v_actor;

  update public.teams
  set leader_user_id = null
  where leader_user_id = v_actor;

  update public.church_join_requests
  set processed_by_user_id = null
  where processed_by_user_id = v_actor;

  delete from public.church_join_requests
  where requester_user_id = v_actor;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_shared_prayer_ids
  from public.church_prayers
  where created_by_user_id = v_actor;

  if cardinality(v_shared_prayer_ids) > 0 then
    delete from public.church_prayer_contents
    where prayer_id = any(v_shared_prayer_ids);
  end if;

  delete from public.church_prayer_contents
  where created_by_user_id = v_actor;

  delete from public.church_prayers
  where created_by_user_id = v_actor;

  update public.churches
  set created_by_user_id = super_admin_user_id
  where created_by_user_id = v_actor
    and super_admin_user_id is distinct from v_actor;

  delete from public.church_memberships
  where user_id = v_actor;

  if cardinality(v_membership_church_ids) > 0 then
    update public.churches
    set deputy_admin_user_ids = public._clean_deputy_admin_user_ids(
      deputy_admin_user_ids,
      array[v_actor::text]
    )
    where id = any(v_membership_church_ids);

    foreach v_church_id in array v_membership_church_ids loop
      perform public._refresh_church_member_count(v_church_id);
    end loop;
  end if;

  delete from public.user_profiles
  where user_id = v_actor;

  delete from auth.users
  where id = v_actor;
end;
$$;

commit;
