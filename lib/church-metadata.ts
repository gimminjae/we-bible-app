import { createSupabaseClient } from '@/lib/supabase-client';
import type {
  MetadataDefinitions,
  MetadataField,
  MetadataFieldInput,
  MetadataSearchResult,
  MemberMetadata,
  MetadataValue,
} from '@/domain/church/metadata';
export * from '@/domain/church/metadata';

type FieldRow = {
  id: string;
  church_id: string;
  system_key: string | null;
  label: string;
  data_type: MetadataField['dataType'];
  options: MetadataField['options'];
  is_active: boolean;
  is_copyable: boolean;
  edit_policy: MetadataField['editPolicy'];
  sort_order: number;
  version: number;
};
function fieldFromRow(row: FieldRow): MetadataField {
  return {
    id: row.id,
    churchId: row.church_id,
    systemKey: row.system_key,
    label: row.label,
    dataType: row.data_type,
    options: row.options,
    isActive: row.is_active,
    isCopyable: row.is_copyable,
    editPolicy: row.edit_policy,
    sortOrder: row.sort_order,
    version: row.version,
  };
}
async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let request = createSupabaseClient().rpc(name, args);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error)
    throw Object.assign(new Error(error.message), { fieldId: error.details });
  return data as T;
}
export async function fetchMetadataDefinitions(
  churchId: string,
  signal?: AbortSignal,
): Promise<MetadataDefinitions> {
  const data = await rpc<{
    role: MetadataDefinitions['role'];
    fields: FieldRow[];
  }>('get_church_member_metadata_fields', { p_church_id: churchId }, signal);
  return { role: data.role, fields: data.fields.map(fieldFromRow) };
}
type MemberResponse = {
  role: MemberMetadata['role'];
  version: number;
  fields: (FieldRow & { value: MetadataValue; can_edit: boolean })[];
};
function memberFromRow(data: MemberResponse): MemberMetadata {
  return {
    role: data.role,
    version: data.version,
    fields: data.fields.map((row) => ({
      ...fieldFromRow(row),
      value: row.value,
      canEdit: row.can_edit,
    })),
  };
}
export async function fetchMemberMetadata(
  churchId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<MemberMetadata> {
  return memberFromRow(
    await rpc<MemberResponse>(
      'get_church_member_metadata',
      { p_church_id: churchId, p_user_id: userId },
      signal,
    ),
  );
}
export async function saveMetadataField(
  churchId: string,
  input: MetadataFieldInput,
  existing?: MetadataField,
) {
  const shared = {
    p_church_id: churchId,
    p_label: input.label.trim(),
    p_options:
      input.options?.map((option) => ({
        ...option,
        label: option.label.trim(),
      })) ?? null,
    p_is_copyable: input.isCopyable,
    p_edit_policy: input.editPolicy,
  };
  return fieldFromRow(
    await rpc<FieldRow>(
      existing
        ? 'update_church_member_metadata_field'
        : 'create_church_member_metadata_field',
      existing
        ? {
            ...shared,
            p_field_id: existing.id,
            p_expected_version: existing.version,
            p_is_active: input.isActive,
          }
        : { ...shared, p_data_type: input.dataType },
    ),
  );
}
export async function saveMemberMetadata(
  churchId: string,
  userId: string,
  version: number,
  patch: Record<string, MetadataValue>,
  versions: Record<string, number>,
) {
  return memberFromRow(
    await rpc<MemberResponse>('save_church_member_metadata', {
      p_church_id: churchId,
      p_user_id: userId,
      p_expected_version: version,
      p_patch: patch,
      p_field_versions: versions,
    }),
  );
}
export async function searchMembersByMetadata(
  churchId: string,
  fieldId: string,
  value: MetadataValue,
  offset: number,
  signal?: AbortSignal,
): Promise<MetadataSearchResult> {
  const data = await rpc<{
    total: number;
    field: FieldRow;
    items: {
      user_id: string;
      value: MetadataValue;
      display_name: string;
      role: MetadataDefinitions['role'];
      team_name: string | null;
    }[];
  }>(
    'search_church_members_by_metadata',
    {
      p_church_id: churchId,
      p_field_id: fieldId,
      p_value: value,
      p_offset: offset,
      p_limit: 30,
    },
    signal,
  );
  return {
    total: data.total,
    field: fieldFromRow(data.field),
    items: data.items.map((item) => ({
      userId: item.user_id,
      value: item.value,
      displayName: item.display_name,
      role: item.role,
      teamName: item.team_name,
    })),
  };
}
export function metadataErrorMessage(
  error: unknown,
  t: (key: string) => string,
) {
  const key = error instanceof Error ? error.message : '';
  const translated = t(`metadata.errors.${key}`);
  return translated === `metadata.errors.${key}`
    ? t('metadata.errors.UNKNOWN')
    : translated;
}
