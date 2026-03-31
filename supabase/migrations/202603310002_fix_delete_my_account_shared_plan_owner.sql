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
