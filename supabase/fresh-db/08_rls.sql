-- Fresh DB bootstrap
-- Kind: row level security

begin;

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
alter table public.developer_inquiries enable row level security;

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
  with check (auth.uid() = user_id);

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
      and public.is_church_member(church_id, auth.uid())
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
          public.is_church_super_admin(church_id, auth.uid())
          or (team_id is not null and public.is_church_admin(church_id, auth.uid()))
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
    (church_id is null and auth.uid() = user_id)
    or (
      church_id is not null
      and (
        public.is_church_super_admin(church_id, auth.uid())
        or (team_id is not null and public.is_church_admin(church_id, auth.uid()))
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

drop policy if exists "churches_read_authenticated" on public.churches;
drop policy if exists "churches_update_super_admin" on public.churches;
create policy "churches_read_authenticated"
  on public.churches
  for select
  using (auth.role() = 'authenticated');
create policy "churches_update_super_admin"
  on public.churches
  for update
  using (public.is_church_super_admin(id, auth.uid()))
  with check (public.is_church_super_admin(id, auth.uid()));

drop policy if exists "teams_read_members" on public.teams;
drop policy if exists "teams_manage_admins" on public.teams;
create policy "teams_read_members"
  on public.teams
  for select
  using (public.is_church_member(church_id, auth.uid()));
create policy "teams_manage_admins"
  on public.teams
  for all
  using (public.is_church_admin(church_id, auth.uid()))
  with check (public.is_church_admin(church_id, auth.uid()));

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
    and auth.uid() = created_by_user_id
  );
create policy "church_memberships_update_super_admin"
  on public.church_memberships
  for update
  using (public.is_church_super_admin(church_id, auth.uid()))
  with check (public.is_church_super_admin(church_id, auth.uid()));
create policy "church_memberships_delete_super_admin"
  on public.church_memberships
  for delete
  using (public.is_church_super_admin(church_id, auth.uid()));

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
    requester_user_id = auth.uid()
    and auth.role() = 'authenticated'
  );
create policy "church_join_requests_update_admins"
  on public.church_join_requests
  for update
  using (public.is_church_admin(church_id, auth.uid()))
  with check (public.is_church_admin(church_id, auth.uid()));

drop policy if exists "plan_progresses_select_access" on public.plan_progresses;
drop policy if exists "plan_progresses_update_self" on public.plan_progresses;
create policy "plan_progresses_select_access"
  on public.plan_progresses
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.plans plan
      where plan.id = plan_progresses.plan_id
        and plan.church_id is not null
        and public.is_church_member(plan.church_id, auth.uid())
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
  using (public.can_manage_church_prayer(id, auth.uid()))
  with check (
    public.can_manage_church_prayer(id, auth.uid())
    and public.can_access_church_audience(church_id, team_id, auth.uid())
  );
create policy "church_prayers_delete_manage"
  on public.church_prayers
  for delete
  using (public.can_manage_church_prayer(id, auth.uid()));

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
create policy "church_prayer_contents_update_manage"
  on public.church_prayer_contents
  for update
  using (public.can_manage_church_prayer_content(id, auth.uid()))
  with check (public.can_manage_church_prayer_content(id, auth.uid()));
create policy "church_prayer_contents_delete_manage"
  on public.church_prayer_contents
  for delete
  using (public.can_manage_church_prayer_content(id, auth.uid()));

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
      from public.prayers
      where prayers.id = prayer_contents.prayer_id
        and prayers.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.prayers
      where prayers.id = prayer_contents.prayer_id
        and prayers.user_id = auth.uid()
    )
  );

drop policy if exists "bible_grass_owner" on public.bible_grass;
create policy "bible_grass_owner"
  on public.bible_grass
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "developer_inquiries_insert_public" on public.developer_inquiries;
create policy "developer_inquiries_insert_public"
  on public.developer_inquiries
  for insert
  with check (
    auth.role() in ('anon', 'authenticated')
    and (author_user_id is null or author_user_id = auth.uid())
  );

commit;
