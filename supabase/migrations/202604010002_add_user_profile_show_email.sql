alter table public.user_profiles
  add column if not exists show_email boolean not null default false;

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

revoke all on function public.can_read_user_profile(uuid, uuid) from public;
grant execute on function public.can_read_user_profile(uuid, uuid) to authenticated;
revoke all on function public.get_visible_user_profiles(uuid[]) from public;
grant execute on function public.get_visible_user_profiles(uuid[]) to authenticated;

drop policy if exists "user_profiles_read_authenticated" on public.user_profiles;
drop policy if exists "user_profiles_read_same_church_or_self" on public.user_profiles;
drop policy if exists "user_profiles_read_self" on public.user_profiles;

create policy "user_profiles_read_self"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);
