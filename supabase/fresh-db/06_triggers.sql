-- Fresh DB bootstrap
-- Kind: triggers

begin;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists churches_set_updated_at on public.churches;
create trigger churches_set_updated_at
before update on public.churches
for each row
execute function public.touch_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row
execute function public.touch_updated_at();

drop trigger if exists church_memberships_set_updated_at on public.church_memberships;
create trigger church_memberships_set_updated_at
before update on public.church_memberships
for each row
execute function public.touch_updated_at();

drop trigger if exists church_memberships_cleanup_team_leader on public.church_memberships;
create trigger church_memberships_cleanup_team_leader
after update of team_id or delete on public.church_memberships
for each row
execute function public.cleanup_team_leader_on_membership_change();

drop trigger if exists plan_progresses_set_updated_at on public.plan_progresses;
create trigger plan_progresses_set_updated_at
before update on public.plan_progresses
for each row
execute function public.touch_updated_at();

drop trigger if exists church_prayers_validate_team_scope on public.church_prayers;
create trigger church_prayers_validate_team_scope
before insert or update on public.church_prayers
for each row
execute function public.validate_church_prayer_team_scope();

drop trigger if exists church_prayer_contents_sync_updated_at on public.church_prayer_contents;
create trigger church_prayer_contents_sync_updated_at
after insert or update or delete on public.church_prayer_contents
for each row
execute function public.sync_church_prayer_updated_at_from_content();

drop trigger if exists church_memberships_after_write_sync on public.church_memberships;
create trigger church_memberships_after_write_sync
after insert or update or delete on public.church_memberships
for each row
execute function public.handle_church_membership_change();

drop trigger if exists plans_after_write_sync_progress on public.plans;
create trigger plans_after_write_sync_progress
after insert or update of church_id, team_id on public.plans
for each row
execute function public.handle_plan_audience_change();

drop trigger if exists developer_inquiries_set_updated_at on public.developer_inquiries;
create trigger developer_inquiries_set_updated_at
before update on public.developer_inquiries
for each row
execute function public.touch_updated_at();

commit;
