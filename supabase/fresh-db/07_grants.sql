-- Fresh DB bootstrap
-- Kind: grants / execute permissions

begin;

revoke all on function public.create_church(text) from public;
grant execute on function public.create_church(text) to authenticated;

revoke all on function public.create_church(text, text) from public;
grant execute on function public.create_church(text, text) to authenticated;

revoke all on function public.update_church_info(bigint, text, text) from public;
grant execute on function public.update_church_info(bigint, text, text) to authenticated;

revoke all on function public.set_team_leader(bigint, uuid) from public;
grant execute on function public.set_team_leader(bigint, uuid) to authenticated;

revoke all on function public.set_church_member_team(bigint, uuid, bigint) from public;
grant execute on function public.set_church_member_team(bigint, uuid, bigint) to authenticated;

revoke all on function public.remove_church_member(bigint, uuid) from public;
grant execute on function public.remove_church_member(bigint, uuid) to authenticated;

revoke all on function public.can_read_user_profile(uuid, uuid) from public;
grant execute on function public.can_read_user_profile(uuid, uuid) to authenticated;

revoke all on function public.get_visible_user_profiles(uuid[]) from public;
grant execute on function public.get_visible_user_profiles(uuid[]) to authenticated;

grant execute on function public.transfer_church_super_admin(bigint, uuid) to authenticated;
grant execute on function public.delete_church_as_super_admin(bigint) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

commit;
