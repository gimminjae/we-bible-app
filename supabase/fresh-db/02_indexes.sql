-- Fresh DB bootstrap
-- Kind: indexes

begin;

create index if not exists memos_user_id_created_at_idx
  on public.memos (user_id, created_at desc, id desc);

create unique index if not exists memos_user_id_client_id_idx
  on public.memos (user_id, client_id)
  where client_id is not null;

create index if not exists churches_name_idx
  on public.churches (name);

create unique index if not exists teams_church_id_name_idx
  on public.teams (church_id, name);

create index if not exists teams_church_id_idx
  on public.teams (church_id, id desc);

create index if not exists church_memberships_user_id_idx
  on public.church_memberships (user_id, joined_at desc);

create index if not exists church_memberships_church_id_team_id_idx
  on public.church_memberships (church_id, team_id);

create index if not exists church_join_requests_church_id_status_idx
  on public.church_join_requests (church_id, status, requested_at desc);

create unique index if not exists church_join_requests_pending_unique_idx
  on public.church_join_requests (church_id, requester_user_id)
  where status = 'pending';

create index if not exists plans_user_id_idx
  on public.plans (user_id, id desc);

create unique index if not exists plans_user_id_client_id_idx
  on public.plans (user_id, client_id)
  where client_id is not null;

create index if not exists plans_church_id_idx
  on public.plans (church_id, id desc);

create index if not exists plans_team_id_idx
  on public.plans (team_id, id desc);

create index if not exists plan_progresses_user_id_idx
  on public.plan_progresses (user_id, updated_at desc);

create index if not exists church_prayers_church_id_updated_at_idx
  on public.church_prayers (church_id, updated_at desc, id desc);

create index if not exists church_prayers_team_id_updated_at_idx
  on public.church_prayers (team_id, updated_at desc, id desc);

create index if not exists church_prayer_contents_prayer_id_registered_at_idx
  on public.church_prayer_contents (prayer_id, registered_at desc, id desc);

create unique index if not exists prayers_user_id_client_id_idx
  on public.prayers (user_id, client_id)
  where client_id is not null;

create index if not exists prayer_contents_prayer_id_registered_at_idx
  on public.prayer_contents (prayer_id, registered_at desc, id desc);

create unique index if not exists prayer_contents_prayer_id_client_id_idx
  on public.prayer_contents (prayer_id, client_id)
  where client_id is not null;

create index if not exists developer_inquiries_status_created_at_idx
  on public.developer_inquiries (status, created_at desc, id desc);

create index if not exists developer_inquiries_author_user_id_created_at_idx
  on public.developer_inquiries (author_user_id, created_at desc, id desc);

commit;
