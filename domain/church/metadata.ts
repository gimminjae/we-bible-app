export const METADATA_TYPES = [
  'text',
  'number',
  'phone',
  'binary',
  'date',
  'email',
] as const;
export const METADATA_POLICIES = [
  'super_admin_only',
  'admins_only',
  'self_and_admins',
  'all_members',
] as const;
export type MetadataType = (typeof METADATA_TYPES)[number];
export type MetadataPolicy = (typeof METADATA_POLICIES)[number];
export type MetadataValue = string | number | null;
export type MetadataOption = { value: string; label: string };
export type MetadataField = {
  id: string;
  churchId: string;
  systemKey: string | null;
  label: string;
  dataType: MetadataType;
  options: MetadataOption[] | null;
  isActive: boolean;
  isCopyable: boolean;
  editPolicy: MetadataPolicy;
  sortOrder: number;
  version: number;
};
export type MemberMetadataField = MetadataField & {
  canEdit: boolean;
  value: MetadataValue;
};
export type MetadataRole = 'super_admin' | 'deputy_admin' | 'member';
export type MetadataDefinitions = {
  role: MetadataRole;
  fields: MetadataField[];
};
export type MemberMetadata = {
  role: MetadataRole;
  version: number;
  fields: MemberMetadataField[];
};
export type MetadataSearchResult = {
  total: number;
  field: MetadataField;
  items: {
    userId: string;
    value: MetadataValue;
    displayName: string;
    role: MetadataRole;
    teamName: string | null;
  }[];
};
export type MetadataFieldInput = {
  label: string;
  dataType: MetadataType;
  options: MetadataOption[] | null;
  isActive: boolean;
  isCopyable: boolean;
  editPolicy: MetadataPolicy;
};

function canonicalNumber(value: string) {
  const [mantissa, power = '0'] = value.toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.replace(/^[+-]/, '').split('.');
  const digits = (whole + fraction).replace(/^0+/, '');
  if (!digits) return '0';
  const significant = digits.replace(/0+$/, '');
  return `${mantissa.startsWith('-') ? '-' : ''}${significant}e${Number(power) - fraction.length + digits.length - significant.length}`;
}

export function parseMetadataValue(
  field: MetadataField,
  input: string,
  search = false,
): MetadataValue {
  const value = input.trim();
  if (!value) return null;
  if ([...value].length > 1000) throw new Error('METADATA_VALUE_TOO_LONG');
  if (search && ['text', 'email', 'phone'].includes(field.dataType)) {
    if (field.dataType === 'phone') {
      const digits = value.replace(/[^0-9]/g, '');
      if (!digits) throw new Error('METADATA_INVALID_PHONE');
      return digits;
    }
    return value;
  }
  switch (field.dataType) {
    case 'number': {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))
        throw new Error('METADATA_INVALID_NUMBER');
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        Math.abs(number) > Number.MAX_SAFE_INTEGER ||
        canonicalNumber(value) !== canonicalNumber(String(number))
      )
        throw new Error('METADATA_INVALID_NUMBER');
      return number;
    }
    case 'binary':
      if (!field.options?.some((option) => option.value === value))
        throw new Error('METADATA_INVALID_OPTIONS');
      break;
    case 'phone':
      if (
        value.length > 40 ||
        !/^[+0-9 ()-]+$/.test(value) ||
        !/[0-9]/.test(value)
      )
        throw new Error('METADATA_INVALID_PHONE');
      break;
    case 'email':
      if ([...value].length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        throw new Error('METADATA_INVALID_EMAIL');
      break;
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
        throw new Error('METADATA_INVALID_DATE');
      const date = new Date(`${value}T00:00:00Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        throw new Error('METADATA_INVALID_DATE');
      const koreaToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (field.systemKey === 'birth_date' && value > koreaToday)
        throw new Error('METADATA_INVALID_DATE');
      break;
    }
  }
  return value;
}

export function formatMetadataValue(
  field: MetadataField,
  value: MetadataValue,
): string {
  if (value === null) return '';
  if (field.dataType === 'binary')
    return field.options?.find((option) => option.value === value)?.label ?? '';
  return String(value);
}

export function validateMetadataDefinition(input: MetadataFieldInput) {
  if (![...input.label.trim()].length || [...input.label.trim()].length > 80)
    throw new Error('METADATA_INVALID_LABEL');
  if (input.dataType === 'binary') {
    if (
      !input.options ||
      input.options.length !== 2 ||
      input.options.some(
        (option, i) =>
          option.value !== `option_${i + 1}` ||
          !option.label.trim() ||
          [...option.label.trim()].length > 40,
      ) ||
      input.options[0].label.trim().toLowerCase() ===
        input.options[1].label.trim().toLowerCase()
    ) {
      throw new Error('METADATA_INVALID_OPTIONS');
    }
  }
}

export function buildMetadataPatch(
  fields: MemberMetadataField[],
  draft: Record<string, string>,
) {
  const patch: Record<string, MetadataValue> = {};
  const versions: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.canEdit || !field.isActive) continue;
    try {
      const value = parseMetadataValue(
        field,
        draft[field.id] ?? String(field.value ?? ''),
      );
      if (value !== field.value) {
        patch[field.id] = value;
        versions[field.id] = field.version;
      }
    } catch (error) {
      errors[field.id] =
        error instanceof Error ? error.message : 'METADATA_INVALID_VALUE';
    }
  }
  return { patch, versions, errors };
}
