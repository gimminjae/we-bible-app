-- Fresh DB bootstrap
-- Kind: helper / access functions

begin;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_church_member(p_church_id bigint, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = p_church_id
      and membership.user_id = p_user_id
  );
$$;

create or replace function public.is_church_admin(p_church_id bigint, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = p_church_id
      and membership.user_id = p_user_id
      and membership.role in ('super_admin', 'deputy_admin')
  );
$$;

create or replace function public.is_church_super_admin(p_church_id bigint, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = p_church_id
      and membership.user_id = p_user_id
      and membership.role = 'super_admin'
  );
$$;

create or replace function public.is_plan_target_member(p_plan_id bigint, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plans plan
    join public.church_memberships membership
      on membership.church_id = plan.church_id
     and membership.user_id = p_user_id
    where plan.id = p_plan_id
      and plan.church_id is not null
      and (plan.team_id is null or membership.team_id = plan.team_id)
  );
$$;

create or replace function public.can_access_church_audience(
  p_church_id bigint,
  p_team_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $church_prayer_access$
  select exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = p_church_id
      and membership.user_id = p_user_id
      and (
        p_team_id is null
        or membership.team_id = p_team_id
        or membership.role in ('super_admin', 'deputy_admin')
      )
  );
$church_prayer_access$;

create or replace function public.can_access_church_prayer(
  p_prayer_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $church_prayer_read$
  select exists (
    select 1
    from public.church_prayers prayer
    where prayer.id = p_prayer_id
      and public.can_access_church_audience(prayer.church_id, prayer.team_id, p_user_id)
  );
$church_prayer_read$;

create or replace function public.can_manage_church_prayer(
  p_prayer_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $church_prayer_manage$
  select exists (
    select 1
    from public.church_prayers prayer
    where prayer.id = p_prayer_id
      and (
        prayer.created_by_user_id = p_user_id
        or public.is_church_admin(prayer.church_id, p_user_id)
      )
  );
$church_prayer_manage$;

create or replace function public.can_manage_church_prayer_content(
  p_content_id bigint,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $church_prayer_content_manage$
  select exists (
    select 1
    from public.church_prayer_contents content
    where content.id = p_content_id
      and (
        content.created_by_user_id = p_user_id
        or public.can_manage_church_prayer(content.prayer_id, p_user_id)
      )
  );
$church_prayer_content_manage$;

create or replace function public.can_read_user_profile(
  p_target_user_id uuid,
  p_actor_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_actor_user_id is not null
    and (
      p_target_user_id = p_actor_user_id
      or exists (
        select 1
        from public.church_memberships target_membership
        join public.church_memberships actor_membership
          on actor_membership.church_id = target_membership.church_id
         and actor_membership.user_id = p_actor_user_id
        where target_membership.user_id = p_target_user_id
      )
      or exists (
        select 1
        from public.church_join_requests request
        where request.requester_user_id = p_target_user_id
          and public.is_church_admin(request.church_id, p_actor_user_id)
      )
    );
$$;

create or replace function public.get_visible_user_profiles(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  show_email boolean,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    profile.user_id,
    profile.display_name,
    case
      when profile.user_id = auth.uid() or profile.show_email then profile.email
      else null
    end as email,
    profile.show_email,
    profile.avatar_url
  from public.user_profiles profile
  where profile.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
    and public.can_read_user_profile(profile.user_id, auth.uid());
$$;

create or replace function public._clean_deputy_admin_user_ids(
  p_value text,
  p_removed_user_ids text[]
)
returns text
language sql
immutable
as $$
  select coalesce(
    (
      select string_agg(item, ',' order by ord)
      from (
        select btrim(value) as item, min(ordinality) as ord
        from unnest(string_to_array(coalesce(p_value, ''), ',')) with ordinality as source(value, ordinality)
        where btrim(value) <> ''
          and not (
            btrim(value) = any (coalesce(p_removed_user_ids, array[]::text[]))
          )
        group by btrim(value)
      ) filtered
    ),
    ''
  );
$$;

create or replace function public._refresh_church_member_count(p_church_id bigint)
returns void
language plpgsql
as $$
begin
  update public.churches
  set member_count = (
    select count(*)
    from public.church_memberships
    where church_id = p_church_id
  )
  where id = p_church_id;
end;
$$;

commit;
