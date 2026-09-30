-- Fresh DB bootstrap
-- Kind: RPC / app entry functions

begin;

create or replace function public.create_church(
  p_name text,
  p_description text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_description text;
  v_church_id bigint;
begin
  v_user_id := auth.uid();
  v_name := trim(coalesce(p_name, ''));
  v_description := trim(coalesce(p_description, ''));

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_name = '' then
    raise exception 'CHURCH_NAME_REQUIRED';
  end if;

  insert into public.churches (
    name,
    description,
    created_by_user_id,
    super_admin_user_id
  )
  values (
    v_name,
    v_description,
    v_user_id,
    v_user_id
  )
  returning id into v_church_id;

  insert into public.church_memberships (
    church_id,
    user_id,
    role,
    created_by_user_id
  )
  values (
    v_church_id,
    v_user_id,
    'super_admin',
    v_user_id
  )
  on conflict (church_id, user_id) do nothing;

  perform public.sync_church_cached_fields(v_church_id);

  return v_church_id;
end;
$$;

create or replace function public.create_church(p_name text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_church(p_name, '');
end;
$$;

create or replace function public.update_church_info(
  p_church_id bigint,
  p_name text,
  p_description text,
  p_shared_plan_ranking_public boolean,
  p_shared_plan_progress_public boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_name text;
  v_description text;
begin
  v_actor_user_id := auth.uid();
  v_name := trim(coalesce(p_name, ''));
  v_description := trim(coalesce(p_description, ''));

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_name = '' then
    raise exception 'CHURCH_NAME_REQUIRED';
  end if;

  if not public.is_church_super_admin(p_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.churches church
  set name = v_name,
      description = v_description,
      shared_plan_ranking_public = coalesce(p_shared_plan_ranking_public, true),
      shared_plan_progress_public = coalesce(p_shared_plan_progress_public, true)
  where church.id = p_church_id;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.update_church_info(
  p_church_id bigint,
  p_name text,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_name text;
  v_description text;
begin
  perform public.update_church_info(
    p_church_id,
    p_name,
    p_description,
    coalesce(
      (select church.shared_plan_ranking_public from public.churches church where church.id = p_church_id),
      true
    ),
    coalesce(
      (select church.shared_plan_progress_public from public.churches church where church.id = p_church_id),
      true
    )
  );
end;
$$;

create or replace function public.set_church_image_url(
  p_church_id bigint,
  p_image_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_church_admin(p_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.churches church
  set image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where church.id = p_church_id;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.set_team_leader(
  p_team_id bigint,
  p_leader_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_church_id bigint;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select team.church_id
  into v_church_id
  from public.teams team
  where team.id = p_team_id;

  if v_church_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not public.is_church_admin(v_church_id, v_actor_user_id) then
    raise exception 'PERMISSION_DENIED';
  end if;

  if p_leader_user_id is not null and not exists (
    select 1
    from public.church_memberships membership
    where membership.church_id = v_church_id
      and membership.user_id = p_leader_user_id
      and membership.team_id = p_team_id
  ) then
    raise exception 'TEAM_LEADER_MUST_BE_TEAM_MEMBER';
  end if;

  update public.teams team
  set leader_user_id = p_leader_user_id
  where team.id = p_team_id;
end;
$$;

create or replace function public.set_church_member_team(
  p_church_id bigint,
  p_target_user_id uuid,
  p_team_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_target_role text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_actor_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = v_actor_user_id;

  if v_actor_role is null then
    raise exception 'PERMISSION_DENIED';
  end if;

  select membership.role
  into v_target_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'CHURCH_MEMBER_NOT_FOUND';
  end if;

  if p_team_id is not null and not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and team.church_id = p_church_id
  ) then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not (
    v_actor_role = 'super_admin'
    or (v_actor_role = 'deputy_admin' and v_target_role = 'member')
  ) then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.church_memberships membership
  set team_id = p_team_id
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;
end;
$$;

create or replace function public.remove_church_member(
  p_church_id bigint,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_target_role text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_actor_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = v_actor_user_id;

  select membership.role
  into v_target_role
  from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'CHURCH_MEMBER_NOT_FOUND';
  end if;

  if v_actor_user_id = p_target_user_id then
    if v_target_role = 'super_admin' then
      raise exception 'SUPER_ADMIN_CANNOT_LEAVE';
    end if;
  elsif not (
    v_actor_role = 'super_admin'
    or (v_actor_role = 'deputy_admin' and v_target_role = 'member')
  ) then
    raise exception 'PERMISSION_DENIED';
  elsif v_target_role = 'super_admin' then
    raise exception 'SUPER_ADMIN_CANNOT_BE_REMOVED';
  end if;

  delete from public.church_memberships membership
  where membership.church_id = p_church_id
    and membership.user_id = p_target_user_id;
end;
$$;

create or replace function public.transfer_church_super_admin(
  p_church_id bigint,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_current_super_admin_user_id uuid;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select super_admin_user_id
  into v_current_super_admin_user_id
  from public.churches
  where id = p_church_id
  for update;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;

  if v_current_super_admin_user_id is distinct from v_actor then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;

  if p_target_user_id = v_actor then
    raise exception 'TARGET_USER_INVALID';
  end if;

  perform 1
  from public.church_memberships
  where church_id = p_church_id
    and user_id = p_target_user_id;

  if not found then
    raise exception 'TARGET_MEMBER_NOT_FOUND';
  end if;

  update public.church_memberships
  set role = 'member',
      updated_at = now()
  where church_id = p_church_id
    and user_id = v_actor;

  update public.church_memberships
  set role = 'super_admin',
      updated_at = now()
  where church_id = p_church_id
    and user_id = p_target_user_id;

  update public.churches
  set super_admin_user_id = p_target_user_id,
      created_by_user_id = p_target_user_id,
      deputy_admin_user_ids = public._clean_deputy_admin_user_ids(
        deputy_admin_user_ids,
        array[v_actor::text, p_target_user_id::text]
      )
  where id = p_church_id;
end;
$$;

create or replace function public.delete_church_as_super_admin(p_church_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_super_admin_user_id uuid;
  v_other_member_count bigint;
  v_plan_ids bigint[];
  v_prayer_ids bigint[];
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select super_admin_user_id
  into v_super_admin_user_id
  from public.churches
  where id = p_church_id
  for update;

  if not found then
    raise exception 'CHURCH_NOT_FOUND';
  end if;

  if v_super_admin_user_id is distinct from v_actor then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;

  select count(*)
  into v_other_member_count
  from public.church_memberships
  where church_id = p_church_id
    and user_id <> v_actor;

  if v_other_member_count > 0 then
    raise exception 'CHURCH_HAS_OTHER_MEMBERS';
  end if;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_prayer_ids
  from public.church_prayers
  where church_id = p_church_id;

  if cardinality(v_prayer_ids) > 0 then
    delete from public.church_prayer_contents
    where prayer_id = any(v_prayer_ids);
  end if;

  delete from public.church_prayers
  where church_id = p_church_id;

  select coalesce(array_agg(id), array[]::bigint[])
  into v_plan_ids
  from public.plans
  where church_id = p_church_id;

  if cardinality(v_plan_ids) > 0 then
    delete from public.plan_progresses
    where plan_id = any(v_plan_ids);
  end if;

  delete from public.plans
  where church_id = p_church_id;

  delete from public.church_join_requests
  where church_id = p_church_id;

  delete from public.church_memberships
  where church_id = p_church_id;

  delete from public.teams
  where church_id = p_church_id;

  delete from public.churches
  where id = p_church_id;
end;
$$;

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

-- Community member metadata
create or replace function church_metadata_private.get_church_member_metadata_fields(p_church_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_fields jsonb;
begin
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid();
  if v_role is null then raise exception 'PERMISSION_DENIED'; end if;
  select coalesce(jsonb_agg(church_metadata_private._metadata_field_json(f) order by sort_order, id), '[]'::jsonb)
    into v_fields from public.church_member_metadata_fields f where church_id = p_church_id;
  return jsonb_build_object('role', v_role, 'fields', v_fields);
end;
$$;

create or replace function church_metadata_private.create_church_member_metadata_field(
  p_church_id bigint, p_label text, p_data_type text, p_options jsonb,
  p_is_copyable boolean, p_edit_policy text default 'self_and_admins'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_field public.church_member_metadata_fields;
begin
  -- Keep the parent alive without blocking membership cache updates on churches.
  perform 1 from public.churches where id = p_church_id for key share;
  perform pg_advisory_xact_lock(hashtextextended('church-metadata-fields:' || p_church_id::text, 0));
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid() for share;
  if v_role is null or v_role not in ('super_admin', 'deputy_admin') then raise exception 'PERMISSION_DENIED'; end if;
  if v_role <> 'super_admin' and p_edit_policy is distinct from 'self_and_admins' then raise exception 'PERMISSION_DENIED'; end if;
  if p_label is null or char_length(btrim(p_label)) not between 1 and 80 then raise exception 'METADATA_INVALID_LABEL'; end if;
  if p_edit_policy is null or p_edit_policy not in ('super_admin_only', 'admins_only', 'self_and_admins', 'all_members') or p_is_copyable is null then
    raise exception 'METADATA_INVALID_SETTINGS';
  end if;
  if (select count(*) from public.church_member_metadata_fields where church_id = p_church_id) >= 100 then raise exception 'METADATA_FIELD_LIMIT'; end if;
  perform church_metadata_private._metadata_validate_definition(p_data_type, p_options);
  insert into public.church_member_metadata_fields
    (church_id, label, data_type, options, is_copyable, edit_policy, sort_order, created_by_user_id, updated_by_user_id)
  select p_church_id, btrim(p_label), p_data_type, p_options, p_is_copyable, p_edit_policy,
    coalesce(max(sort_order), -1) + 1, auth.uid(), auth.uid()
    from public.church_member_metadata_fields where church_id = p_church_id
  returning * into v_field;
  return church_metadata_private._metadata_field_json(v_field);
exception when unique_violation then raise exception 'METADATA_DUPLICATE_LABEL';
end;
$$;

create or replace function church_metadata_private.update_church_member_metadata_field(
  p_church_id bigint, p_field_id bigint, p_expected_version integer,
  p_label text, p_options jsonb, p_is_active boolean, p_is_copyable boolean, p_edit_policy text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_field public.church_member_metadata_fields;
begin
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid() for share;
  if v_role is null or v_role not in ('super_admin', 'deputy_admin') then raise exception 'PERMISSION_DENIED'; end if;
  select * into v_field from public.church_member_metadata_fields where church_id = p_church_id and id = p_field_id for update;
  if not found then raise exception 'METADATA_FIELD_NOT_FOUND'; end if;
  if v_field.version is distinct from p_expected_version then raise exception 'METADATA_CONFLICT'; end if;
  if v_role <> 'super_admin' and p_edit_policy is distinct from v_field.edit_policy then raise exception 'PERMISSION_DENIED'; end if;
  if p_label is null or char_length(btrim(p_label)) not between 1 and 80 then raise exception 'METADATA_INVALID_LABEL'; end if;
  if p_is_active is null or p_is_copyable is null or p_edit_policy is null or p_edit_policy not in ('super_admin_only', 'admins_only', 'self_and_admins', 'all_members') then
    raise exception 'METADATA_INVALID_SETTINGS';
  end if;
  perform church_metadata_private._metadata_validate_definition(v_field.data_type, p_options);
  update public.church_member_metadata_fields set label = btrim(p_label), options = p_options,
    is_active = p_is_active, is_copyable = p_is_copyable, edit_policy = p_edit_policy,
    version = version + 1, updated_by_user_id = auth.uid(), updated_at = now()
    where id = p_field_id returning * into v_field;
  return church_metadata_private._metadata_field_json(v_field);
exception when unique_violation then raise exception 'METADATA_DUPLICATE_LABEL';
end;
$$;

create or replace function church_metadata_private.get_church_member_metadata(p_church_id bigint, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_fields jsonb; v_values jsonb; v_version integer;
begin
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid();
  if v_role is null or not public.is_church_member(p_church_id, p_user_id) then raise exception 'PERMISSION_DENIED'; end if;
  select "values", version into v_values, v_version from public.church_member_metadata where church_id = p_church_id and user_id = p_user_id;
  select coalesce(jsonb_agg(church_metadata_private._metadata_field_json(f) || jsonb_build_object(
      'can_edit', f.is_active and church_metadata_private._metadata_can_edit(v_role, auth.uid(), p_user_id, f.edit_policy),
      'value', coalesce(v_values->f.id::text, 'null'::jsonb)) order by f.sort_order, f.id), '[]'::jsonb)
    into v_fields from public.church_member_metadata_fields f where f.church_id = p_church_id
      and church_metadata_private._metadata_can_read(v_role, auth.uid(), p_user_id, f.edit_policy);
  return jsonb_build_object('fields', v_fields, 'version', coalesce(v_version, 0), 'role', v_role);
end;
$$;

create or replace function church_metadata_private.save_church_member_metadata(
  p_church_id bigint, p_user_id uuid, p_expected_version integer, p_field_versions jsonb, p_patch jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_field public.church_member_metadata_fields; v_key text; v_input jsonb; v_value jsonb;
  v_values jsonb; v_version integer;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or octet_length(p_patch::text) > 262144
    or p_field_versions is null or jsonb_typeof(p_field_versions) <> 'object' then raise exception 'METADATA_INVALID_VALUE'; end if;
  -- Lock both memberships in UUID order, including the missing metadata-row case.
  perform 1 from public.church_memberships where church_id = p_church_id and user_id in (auth.uid(), p_user_id) order by user_id for update;
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid();
  if v_role is null or not public.is_church_member(p_church_id, p_user_id) then raise exception 'PERMISSION_DENIED'; end if;
  select "values", version into v_values, v_version from public.church_member_metadata where church_id = p_church_id and user_id = p_user_id for update;
  v_values := coalesce(v_values, '{}'::jsonb);
  if coalesce(v_version, 0) is distinct from p_expected_version then raise exception 'METADATA_CONFLICT'; end if;
  for v_key, v_input in select key, value from jsonb_each(p_patch) order by key loop
    select * into v_field from public.church_member_metadata_fields where church_id = p_church_id and id::text = v_key for share;
    if not found then raise exception 'METADATA_FIELD_NOT_FOUND'; end if;
    if not v_field.is_active then raise exception 'METADATA_FIELD_INACTIVE'; end if;
    if not church_metadata_private._metadata_can_edit(v_role, auth.uid(), p_user_id, v_field.edit_policy) then raise exception 'PERMISSION_DENIED'; end if;
    if p_field_versions->v_key is distinct from to_jsonb(v_field.version) then raise exception 'METADATA_CONFLICT'; end if;
    begin
      v_value := church_metadata_private._metadata_validate_value(v_field, v_input);
    exception when others then raise exception using message = sqlerrm, detail = v_key; end;
    if v_value = 'null'::jsonb then v_values := v_values - v_key;
    else v_values := jsonb_set(v_values, array[v_key], v_value); end if;
  end loop;
  if p_patch <> '{}'::jsonb then
    insert into public.church_member_metadata(church_id, user_id, "values", updated_by_user_id)
      values(p_church_id, p_user_id, v_values, auth.uid())
    on conflict (church_id, user_id) do update set "values" = excluded."values",
      version = church_member_metadata.version + 1, updated_by_user_id = auth.uid(), updated_at = now();
  end if;
  return church_metadata_private.get_church_member_metadata(p_church_id, p_user_id);
end;
$$;

create or replace function church_metadata_private.search_church_members_by_metadata(
  p_church_id bigint, p_field_id bigint, p_value jsonb, p_limit integer default 30, p_offset integer default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_field public.church_member_metadata_fields; v_value jsonb; v_query text; v_result jsonb;
begin
  select role into v_role from public.church_memberships where church_id = p_church_id and user_id = auth.uid();
  if v_role is null then raise exception 'PERMISSION_DENIED'; end if;
  select * into v_field from public.church_member_metadata_fields where church_id = p_church_id and id = p_field_id;
  if not found then raise exception 'METADATA_FIELD_NOT_FOUND'; end if;
  if not v_field.is_active then raise exception 'METADATA_FIELD_INACTIVE'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then raise exception 'METADATA_INVALID_VALUE'; end if;
  if v_field.data_type in ('text', 'email', 'phone') then
    if p_value is null or jsonb_typeof(p_value) <> 'string' then raise exception 'METADATA_INVALID_VALUE'; end if;
    v_query := regexp_replace(p_value #>> '{}', '^\s+|\s+$', '', 'g');
    if char_length(v_query) not between 1 and 1000 then raise exception 'METADATA_INVALID_VALUE'; end if;
    if v_field.data_type = 'phone' then
      v_query := regexp_replace(v_query, '[^0-9]', '', 'g');
      if v_query = '' then raise exception 'METADATA_INVALID_PHONE'; end if;
    end if;
  else
    v_value := church_metadata_private._metadata_validate_value(v_field, p_value);
    if v_value = 'null'::jsonb then raise exception 'METADATA_INVALID_VALUE'; end if;
  end if;
  with matches as materialized (
    select m.user_id, m."values"->p_field_id::text as value,
      case ms.role when 'super_admin' then 0 when 'deputy_admin' then 1 else 2 end as role_order,
      coalesce(nullif(prof.display_name, ''), left(m.user_id::text, 8) || '...') as display_name,
      ms.role, team.name as team_name
    from public.church_member_metadata m
    join public.church_memberships ms on (ms.church_id, ms.user_id) = (m.church_id, m.user_id)
    left join public.user_profiles prof on prof.user_id = m.user_id
    left join public.teams team on team.id = ms.team_id and team.church_id = ms.church_id
    where m.church_id = p_church_id
      and church_metadata_private._metadata_can_read(v_role, auth.uid(), m.user_id, v_field.edit_policy)
      and m."values" ? p_field_id::text
      and case v_field.data_type
        when 'text' then strpos(lower(m."values"->>p_field_id::text), lower(v_query)) > 0
        when 'email' then strpos(lower(m."values"->>p_field_id::text), lower(v_query)) > 0
        when 'phone' then strpos(regexp_replace(m."values"->>p_field_id::text, '[^0-9]', '', 'g'), v_query) > 0
        else m."values"->p_field_id::text = v_value end
  ), page as (select * from matches order by role_order, display_name, user_id limit p_limit offset p_offset)
  select jsonb_build_object('total', (select count(*) from matches),
    'field', church_metadata_private._metadata_field_json(v_field),
    'items', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'value', value, 'display_name', display_name, 'role', role, 'team_name', team_name) order by role_order, display_name, user_id) from page), '[]'::jsonb)) into v_result;
  return v_result;
end;
$$;

-- Public Data API entry points. Privileged implementations live outside exposed schemas.
create or replace function public.get_church_member_metadata_fields(p_church_id bigint)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.get_church_member_metadata_fields(p_church_id);
$$;

create or replace function public.create_church_member_metadata_field(
  p_church_id bigint, p_label text, p_data_type text, p_options jsonb,
  p_is_copyable boolean, p_edit_policy text default 'self_and_admins'
)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.create_church_member_metadata_field(p_church_id, p_label, p_data_type, p_options, p_is_copyable, p_edit_policy);
$$;

create or replace function public.update_church_member_metadata_field(
  p_church_id bigint, p_field_id bigint, p_expected_version integer,
  p_label text, p_options jsonb, p_is_active boolean, p_is_copyable boolean, p_edit_policy text
)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.update_church_member_metadata_field(p_church_id, p_field_id, p_expected_version, p_label, p_options, p_is_active, p_is_copyable, p_edit_policy);
$$;

create or replace function public.get_church_member_metadata(p_church_id bigint, p_user_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.get_church_member_metadata(p_church_id, p_user_id);
$$;

create or replace function public.save_church_member_metadata(
  p_church_id bigint, p_user_id uuid, p_expected_version integer, p_field_versions jsonb, p_patch jsonb
)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.save_church_member_metadata(p_church_id, p_user_id, p_expected_version, p_field_versions, p_patch);
$$;

create or replace function public.search_church_members_by_metadata(
  p_church_id bigint, p_field_id bigint, p_value jsonb, p_limit integer default 30, p_offset integer default 0
)
returns jsonb language sql security invoker set search_path = '' as $$
  select church_metadata_private.search_church_members_by_metadata(p_church_id, p_field_id, p_value, p_limit, p_offset);
$$;

commit;
