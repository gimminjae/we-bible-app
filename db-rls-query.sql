-- RLS policy set for the current we-bible-app Supabase access patterns.
-- Assumption:
--   Base tables, indexes, triggers, and helper functions from supabase/schema.sql
--   already exist before this file is executed.
--
-- Main code paths analyzed:
--   - lib/sqlite-supabase-store.ts
--   - lib/church.ts
--   - hooks/use-churches.ts
--   - app/(tabs)/churches/**
--   - app/(tabs)/settings.tsx
--
-- Notes:
--   - Church/team lifecycle changes that must bypass direct table access
--     (create_church, update_church_info, set_team_leader, set_church_member_team, remove_church_member,
--      transfer_church_super_admin, delete_church_as_super_admin, delete_my_account)
--     should continue to use SECURITY DEFINER RPC functions.
--   - Shared profile reads should use public.get_visible_user_profiles(uuid[]) instead of direct
--     public.user_profiles selects so hidden emails stay masked at the DB boundary.
--   - Team-scoped shared plans are readable by their target team members and church admins.

begin;

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

alter table public.bible_state enable row level security;
alter table public.favorite_verses enable row level security;
alter table public.memos enable row level security;
alter table public.memo_verses enable row level security;
alter table public.plans enable row level security;
alter table public.user_profiles enable row level security;
alter table public.churches enable row level security;
alter table public.teams enable row level security;
alter table public.church_memberships enable row level security;
alter table public.church_join_requests enable row level security;
alter table public.plan_progresses enable row level security;
alter table public.church_prayers enable row level security;
alter table public.church_prayer_contents enable row level security;
alter table public.prayers enable row level security;
alter table public.prayer_contents enable row level security;
alter table public.bible_grass enable row level security;

-- Personal sync tables used by lib/sqlite-supabase-store.ts
drop policy if exists "bible_state_owner" on public.bible_state;
create policy "bible_state_owner"
  on public.bible_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "favorite_verses_owner" on public.favorite_verses;
create policy "favorite_verses_owner"
  on public.favorite_verses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "memos_owner" on public.memos;
create policy "memos_owner"
  on public.memos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "memo_verses_owner" on public.memo_verses;
create policy "memo_verses_owner"
  on public.memo_verses
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.memos memo
      where memo.id = memo_id
        and memo.user_id = auth.uid()
    )
  );

drop policy if exists "prayers_owner" on public.prayers;
create policy "prayers_owner"
  on public.prayers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prayer_contents_owner" on public.prayer_contents;
create policy "prayer_contents_owner"
  on public.prayer_contents
  for all
  using (
    exists (
      select 1
      from public.prayers prayer
      where prayer.id = prayer_contents.prayer_id
        and prayer.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.prayers prayer
      where prayer.id = prayer_contents.prayer_id
        and prayer.user_id = auth.uid()
    )
  );

drop policy if exists "bible_grass_owner" on public.bible_grass;
create policy "bible_grass_owner"
  on public.bible_grass
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User profiles used by settings + church/member rendering
drop policy if exists "user_profiles_read_authenticated" on public.user_profiles;
drop policy if exists "user_profiles_read_same_church_or_self" on public.user_profiles;
drop policy if exists "user_profiles_read_self" on public.user_profiles;
drop policy if exists "user_profiles_self_insert" on public.user_profiles;
drop policy if exists "user_profiles_self_update" on public.user_profiles;
drop policy if exists "user_profiles_self_delete" on public.user_profiles;
create policy "user_profiles_read_self"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);
create policy "user_profiles_self_insert"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);
create policy "user_profiles_self_update"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "user_profiles_self_delete"
  on public.user_profiles
  for delete
  using (auth.uid() = user_id);

-- Church directory/search
drop policy if exists "churches_read_authenticated" on public.churches;
drop policy if exists "churches_update_super_admin" on public.churches;
create policy "churches_read_authenticated"
  on public.churches
  for select
  using (auth.role() = 'authenticated');

-- Teams: read for members, create for admins. Team leader changes should use RPC.
drop policy if exists "teams_read_members" on public.teams;
drop policy if exists "teams_manage_admins" on public.teams;
drop policy if exists "teams_insert_admins" on public.teams;
create policy "teams_read_members"
  on public.teams
  for select
  using (public.is_church_member(church_id, auth.uid()));
create policy "teams_insert_admins"
  on public.teams
  for insert
  with check (
    public.is_church_admin(church_id, auth.uid())
    and created_by_user_id = auth.uid()
    and leader_user_id is null
    and btrim(name) <> ''
  );

-- Church memberships:
--   - select: member list / my memberships
--   - insert: join approval flow
--   - update: super admin role changes only
drop policy if exists "church_memberships_read_members" on public.church_memberships;
drop policy if exists "church_memberships_insert_admins" on public.church_memberships;
drop policy if exists "church_memberships_update_super_admin" on public.church_memberships;
drop policy if exists "church_memberships_delete_super_admin" on public.church_memberships;
create policy "church_memberships_read_members"
  on public.church_memberships
  for select
  using (
    auth.uid() = user_id
    or public.is_church_member(church_id, auth.uid())
  );
create policy "church_memberships_insert_admins"
  on public.church_memberships
  for insert
  with check (
    public.is_church_admin(church_id, auth.uid())
    and created_by_user_id = auth.uid()
    and role = 'member'
    and (
      team_id is null
      or exists (
        select 1
        from public.teams team
        where team.id = church_memberships.team_id
          and team.church_id = church_memberships.church_id
      )
    )
  );
create policy "church_memberships_update_super_admin"
  on public.church_memberships
  for update
  using (
    public.is_church_super_admin(church_id, auth.uid())
    and user_id <> auth.uid()
  )
  with check (
    public.is_church_super_admin(church_id, auth.uid())
    and user_id <> auth.uid()
    and role in ('deputy_admin', 'member')
    and (
      team_id is null
      or exists (
        select 1
        from public.teams team
        where team.id = church_memberships.team_id
          and team.church_id = church_memberships.church_id
      )
    )
  );

-- Join requests:
--   - requester can create/read own requests
--   - church admins can read and approve/reject
drop policy if exists "church_join_requests_select_access" on public.church_join_requests;
drop policy if exists "church_join_requests_insert_self" on public.church_join_requests;
drop policy if exists "church_join_requests_update_admins" on public.church_join_requests;
create policy "church_join_requests_select_access"
  on public.church_join_requests
  for select
  using (
    requester_user_id = auth.uid()
    or public.is_church_admin(church_id, auth.uid())
  );
create policy "church_join_requests_insert_self"
  on public.church_join_requests
  for insert
  with check (
    auth.role() = 'authenticated'
    and requester_user_id = auth.uid()
    and coalesce(status, 'pending') = 'pending'
    and processed_at is null
    and processed_by_user_id is null
    and not public.is_church_member(church_id, auth.uid())
  );
create policy "church_join_requests_update_admins"
  on public.church_join_requests
  for update
  using (public.is_church_admin(church_id, auth.uid()))
  with check (
    public.is_church_admin(church_id, auth.uid())
    and status in ('approved', 'rejected')
    and processed_at is not null
    and processed_by_user_id = auth.uid()
  );

-- Plans:
--   - personal plans: owner CRUD
--   - church-wide shared plans: super admin CRUD
--   - team shared plans: church admin CRUD
--   - read access for target members or church admins
drop policy if exists "plans_owner" on public.plans;
drop policy if exists "plans_select_access" on public.plans;
drop policy if exists "plans_insert_access" on public.plans;
drop policy if exists "plans_update_access" on public.plans;
drop policy if exists "plans_delete_access" on public.plans;
create policy "plans_select_access"
  on public.plans
  for select
  using (
    auth.uid() = user_id
    or (
      church_id is not null
      and (
        public.is_plan_target_member(id, auth.uid())
        or public.is_church_admin(church_id, auth.uid())
      )
    )
  );
create policy "plans_insert_access"
  on public.plans
  for insert
  with check (
    auth.uid() = user_id
    and (
      (church_id is null and team_id is null)
      or (
        church_id is not null
        and (
          (
            team_id is null
            and public.is_church_super_admin(church_id, auth.uid())
          )
          or (
            team_id is not null
            and public.is_church_admin(church_id, auth.uid())
            and exists (
              select 1
              from public.teams team
              where team.id = plans.team_id
                and team.church_id = plans.church_id
            )
          )
        )
      )
    )
  );
create policy "plans_update_access"
  on public.plans
  for update
  using (
    (church_id is null and auth.uid() = user_id)
    or (
      church_id is not null
      and (
        public.is_church_super_admin(church_id, auth.uid())
        or (team_id is not null and public.is_church_admin(church_id, auth.uid()))
      )
    )
  )
  with check (
    (church_id is null and auth.uid() = user_id and team_id is null)
    or (
      church_id is not null
      and (
        (
          team_id is null
          and public.is_church_super_admin(church_id, auth.uid())
        )
        or (
          team_id is not null
          and public.is_church_admin(church_id, auth.uid())
          and exists (
            select 1
            from public.teams team
            where team.id = plans.team_id
              and team.church_id = plans.church_id
          )
        )
      )
    )
  );
create policy "plans_delete_access"
  on public.plans
  for delete
  using (
    (church_id is null and auth.uid() = user_id)
    or (
      church_id is not null
      and (
        public.is_church_super_admin(church_id, auth.uid())
        or (team_id is not null and public.is_church_admin(church_id, auth.uid()))
      )
    )
  );

-- Shared plan progress:
--   - select: target members or church admins
--   - update: each user can update only their own target row
drop policy if exists "plan_progresses_select_access" on public.plan_progresses;
drop policy if exists "plan_progresses_update_self" on public.plan_progresses;
create policy "plan_progresses_select_access"
  on public.plan_progresses
  for select
  using (
    auth.uid() = user_id
    or public.is_plan_target_member(plan_id, auth.uid())
    or exists (
      select 1
      from public.plans plan
      where plan.id = plan_progresses.plan_id
        and plan.church_id is not null
        and public.is_church_admin(plan.church_id, auth.uid())
    )
  );
create policy "plan_progresses_update_self"
  on public.plan_progresses
  for update
  using (
    auth.uid() = user_id
    and public.is_plan_target_member(plan_id, auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.is_plan_target_member(plan_id, auth.uid())
  );

-- Church prayer boards
drop policy if exists "church_prayers_select_access" on public.church_prayers;
drop policy if exists "church_prayers_insert_access" on public.church_prayers;
drop policy if exists "church_prayers_update_manage" on public.church_prayers;
drop policy if exists "church_prayers_delete_manage" on public.church_prayers;
create policy "church_prayers_select_access"
  on public.church_prayers
  for select
  using (public.can_access_church_audience(church_id, team_id, auth.uid()));
create policy "church_prayers_insert_access"
  on public.church_prayers
  for insert
  with check (
    created_by_user_id = auth.uid()
    and public.can_access_church_audience(church_id, team_id, auth.uid())
  );
create policy "church_prayers_update_manage"
  on public.church_prayers
  for update
  using (
    created_by_user_id = auth.uid()
    or public.is_church_admin(church_id, auth.uid())
  )
  with check (
    (
      created_by_user_id = auth.uid()
      or public.is_church_admin(church_id, auth.uid())
    )
    and public.can_access_church_audience(church_id, team_id, auth.uid())
  );
create policy "church_prayers_delete_manage"
  on public.church_prayers
  for delete
  using (
    created_by_user_id = auth.uid()
    or public.is_church_admin(church_id, auth.uid())
  );

drop policy if exists "church_prayer_contents_select_access" on public.church_prayer_contents;
drop policy if exists "church_prayer_contents_insert_access" on public.church_prayer_contents;
drop policy if exists "church_prayer_contents_update_manage" on public.church_prayer_contents;
drop policy if exists "church_prayer_contents_delete_manage" on public.church_prayer_contents;
create policy "church_prayer_contents_select_access"
  on public.church_prayer_contents
  for select
  using (public.can_access_church_prayer(prayer_id, auth.uid()));
create policy "church_prayer_contents_insert_access"
  on public.church_prayer_contents
  for insert
  with check (
    created_by_user_id = auth.uid()
    and public.can_access_church_prayer(prayer_id, auth.uid())
  );
create policy "church_prayer_contents_delete_manage"
  on public.church_prayer_contents
  for delete
  using (
    created_by_user_id = auth.uid()
    or exists (
      select 1
      from public.church_prayers prayer
      where prayer.id = church_prayer_contents.prayer_id
        and public.is_church_admin(prayer.church_id, auth.uid())
    )
  );

commit;
