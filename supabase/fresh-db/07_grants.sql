-- Fresh DB bootstrap
-- Kind: grants / execute permissions

begin;

revoke all on function public.create_church(text) from public;
grant execute on function public.create_church(text) to authenticated;

revoke all on function public.create_church(text, text) from public;
grant execute on function public.create_church(text, text) to authenticated;

revoke all on function public.update_church_info(bigint, text, text) from public;
grant execute on function public.update_church_info(bigint, text, text) to authenticated;
revoke all on function public.update_church_info(bigint, text, text, boolean, boolean) from public;
grant execute on function public.update_church_info(bigint, text, text, boolean, boolean) to authenticated;
revoke all on function public.set_church_image_url(bigint, text) from public;
grant execute on function public.set_church_image_url(bigint, text) to authenticated;

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

-- Community member metadata
revoke all on schema church_metadata_private from public, anon, authenticated;
grant usage on schema church_metadata_private to authenticated;
revoke all on public.church_member_metadata_fields, public.church_member_metadata from public, anon, authenticated;
grant select on public.church_member_metadata_fields, public.church_member_metadata to authenticated;
revoke all on sequence public.church_member_metadata_fields_id_seq from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select oid::regprocedure as signature, proname from pg_proc where pronamespace in ('public'::regnamespace, 'church_metadata_private'::regnamespace)
    and proname in ('_metadata_can_read', '_metadata_can_edit', '_metadata_field_json', '_metadata_validate_definition',
      '_metadata_validate_value', '_metadata_guard_field', '_seed_church_member_metadata_fields', '_metadata_on_church_created',
      'get_church_member_metadata_fields', 'create_church_member_metadata_field', 'update_church_member_metadata_field',
      'get_church_member_metadata', 'save_church_member_metadata', 'search_church_members_by_metadata') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    if left(f.proname, 1) <> '_' then execute format('grant execute on function %s to authenticated', f.signature); end if;
  end loop;
end;
$$;

commit;
