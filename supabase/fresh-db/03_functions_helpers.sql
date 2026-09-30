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

-- Community member metadata
create or replace function church_metadata_private._metadata_can_read(p_role text, p_actor uuid, p_target uuid, p_policy text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_role in ('super_admin', 'deputy_admin') or p_actor = p_target
    or (p_role = 'member' and p_policy = 'all_members'), false);
$$;

create or replace function church_metadata_private._metadata_can_edit(p_role text, p_actor uuid, p_target uuid, p_policy text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(case p_policy
    when 'super_admin_only' then p_role = 'super_admin'
    when 'admins_only' then p_role in ('super_admin', 'deputy_admin')
    when 'self_and_admins' then p_role in ('super_admin', 'deputy_admin') or (p_role = 'member' and p_actor = p_target)
    when 'all_members' then p_role in ('super_admin', 'deputy_admin', 'member')
    else false end, false);
$$;

create or replace function church_metadata_private._metadata_field_json(p_field public.church_member_metadata_fields)
returns jsonb language sql stable set search_path = '' as $$
  select to_jsonb(p_field) || jsonb_build_object('id', p_field.id::text, 'church_id', p_field.church_id::text);
$$;

create or replace function church_metadata_private._metadata_validate_definition(p_type text, p_options jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if p_type is null or p_type not in ('text', 'number', 'phone', 'binary', 'date', 'email') then
    raise exception 'METADATA_INVALID_TYPE';
  end if;
  if p_type <> 'binary' then
    if p_options is not null then raise exception 'METADATA_INVALID_OPTIONS'; end if;
    return;
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' then raise exception 'METADATA_INVALID_OPTIONS'; end if;
  if jsonb_array_length(p_options) <> 2 then raise exception 'METADATA_INVALID_OPTIONS'; end if;
  for i in 0..1 loop
    if jsonb_typeof(p_options->i) <> 'object'
      or p_options->i->>'value' is distinct from 'option_' || (i + 1)::text
      or jsonb_typeof(p_options->i->'label') is distinct from 'string'
      or char_length(btrim(p_options->i->>'label')) not between 1 and 40
      or p_options->i->>'label' <> btrim(p_options->i->>'label') then
      raise exception 'METADATA_INVALID_OPTIONS';
    end if;
  end loop;
  if lower(p_options->0->>'label') = lower(p_options->1->>'label') then
    raise exception 'METADATA_INVALID_OPTIONS';
  end if;
end;
$$;

create or replace function church_metadata_private._metadata_validate_value(p_field public.church_member_metadata_fields, p_value jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v_text text; v_date date;
begin
  if p_value is null or p_value = 'null'::jsonb then return 'null'::jsonb; end if;
  if p_field.data_type = 'number' then
    if jsonb_typeof(p_value) <> 'number' then raise exception 'METADATA_INVALID_NUMBER'; end if;
    if abs((p_value #>> '{}')::numeric) > 9007199254740991 then raise exception 'METADATA_INVALID_NUMBER'; end if;
    begin
      if (p_value #>> '{}')::numeric is distinct from ((p_value #>> '{}')::double precision)::text::numeric then
        raise exception 'METADATA_INVALID_NUMBER';
      end if;
    exception when numeric_value_out_of_range then raise exception 'METADATA_INVALID_NUMBER'; end;
    return p_value;
  end if;
  if jsonb_typeof(p_value) <> 'string' then raise exception 'METADATA_INVALID_VALUE'; end if;
  v_text := regexp_replace(p_value #>> '{}', '^\s+|\s+$', '', 'g');
  if v_text = '' then return 'null'::jsonb; end if;
  if char_length(v_text) > 1000 then raise exception 'METADATA_VALUE_TOO_LONG'; end if;
  case p_field.data_type
    when 'binary' then
      if not exists(select 1 from jsonb_array_elements(p_field.options) o where o->>'value' = v_text) then
        raise exception 'METADATA_INVALID_OPTIONS';
      end if;
    when 'phone' then
      if char_length(v_text) > 40 or v_text !~ '^[+0-9 ()-]+$' or v_text !~ '[0-9]' then
        raise exception 'METADATA_INVALID_PHONE';
      end if;
    when 'email' then
      if char_length(v_text) > 254 or v_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception 'METADATA_INVALID_EMAIL';
      end if;
    when 'date' then
      if v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'METADATA_INVALID_DATE'; end if;
      begin v_date := v_text::date;
      exception when others then raise exception 'METADATA_INVALID_DATE'; end;
      if to_char(v_date, 'YYYY-MM-DD') <> v_text or (p_field.system_key = 'birth_date' and v_date > (now() at time zone 'Asia/Seoul')::date) then
        raise exception 'METADATA_INVALID_DATE';
      end if;
    else null;
  end case;
  return to_jsonb(v_text);
end;
$$;

-- A trigger also protects immutable field identity from privileged accidental updates.
create or replace function church_metadata_private._metadata_guard_field()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform church_metadata_private._metadata_validate_definition(new.data_type, new.options);
  if tg_op = 'UPDATE' then
    if (new.id, new.church_id, new.system_key, new.data_type) is distinct from
       (old.id, old.church_id, old.system_key, old.data_type) then raise exception 'METADATA_IMMUTABLE_FIELD'; end if;
  end if;
  return new;
end;
$$;

commit;
