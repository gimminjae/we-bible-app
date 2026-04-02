-- Fresh DB bootstrap
-- Kind: sync / trigger support functions

begin;

create or replace function public.sync_church_cached_fields(p_church_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.churches church
  set member_count = (
        select count(*)
        from public.church_memberships membership
        where membership.church_id = p_church_id
      ),
      deputy_admin_user_ids = coalesce((
        select string_agg(membership.user_id::text, ', ' order by membership.joined_at, membership.user_id::text)
        from public.church_memberships membership
        where membership.church_id = p_church_id
          and membership.role = 'deputy_admin'
      ), ''),
      updated_at = timezone('utc', now())
  where church.id = p_church_id;
end;
$$;

create or replace function public.sync_plan_progress_rows_for_plan(p_plan_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id bigint;
  v_team_id bigint;
begin
  select plan.church_id, plan.team_id
  into v_church_id, v_team_id
  from public.plans plan
  where plan.id = p_plan_id;

  if v_church_id is null then
    return;
  end if;

  insert into public.plan_progresses (
    plan_id,
    user_id,
    goal_status,
    current_read_count,
    goal_percent,
    read_count_per_day,
    rest_day
  )
  select
    p_plan_id,
    membership.user_id,
    '[]'::jsonb,
    0,
    0,
    0,
    0
  from public.church_memberships membership
  where membership.church_id = v_church_id
    and (v_team_id is null or membership.team_id = v_team_id)
  on conflict (plan_id, user_id) do nothing;
end;
$$;

create or replace function public.sync_plan_progress_rows_for_member(
  p_church_id bigint,
  p_user_id uuid,
  p_team_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plan_progresses (
    plan_id,
    user_id,
    goal_status,
    current_read_count,
    goal_percent,
    read_count_per_day,
    rest_day
  )
  select
    plan.id,
    p_user_id,
    '[]'::jsonb,
    0,
    0,
    0,
    0
  from public.plans plan
  where plan.church_id = p_church_id
    and (plan.team_id is null or plan.team_id = p_team_id)
  on conflict (plan_id, user_id) do nothing;
end;
$$;

create or replace function public.handle_church_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_church_cached_fields(old.church_id);
    return old;
  end if;

  perform public.sync_church_cached_fields(new.church_id);
  perform public.sync_plan_progress_rows_for_member(new.church_id, new.user_id, new.team_id);
  return new;
end;
$$;

create or replace function public.handle_plan_audience_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.church_id is not null then
    perform public.sync_plan_progress_rows_for_plan(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.cleanup_team_leader_on_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.teams team
    set leader_user_id = null
    where team.church_id = old.church_id
      and team.leader_user_id = old.user_id;

    return old;
  end if;

  if old.team_id is distinct from new.team_id then
    update public.teams team
    set leader_user_id = null
    where team.church_id = old.church_id
      and team.id = old.team_id
      and team.leader_user_id = old.user_id;
  end if;

  return new;
end;
$$;

create or replace function public.validate_church_prayer_team_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $church_prayer_validate$
begin
  if new.team_id is not null and not exists (
    select 1
    from public.teams team
    where team.id = new.team_id
      and team.church_id = new.church_id
  ) then
    raise exception 'INVALID_PRAYER_TEAM_SCOPE';
  end if;

  return new;
end;
$church_prayer_validate$;

create or replace function public.sync_church_prayer_updated_at_from_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $church_prayer_touch$
declare
  v_prayer_id bigint;
begin
  v_prayer_id := case when tg_op = 'DELETE' then old.prayer_id else new.prayer_id end;

  update public.church_prayers prayer
  set updated_at = to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS')
  where prayer.id = v_prayer_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$church_prayer_touch$;

commit;
