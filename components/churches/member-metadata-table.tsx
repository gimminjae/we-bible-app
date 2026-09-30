import { useState, type ReactNode } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import {
  formatMetadataValue,
  type MemberMetadataField,
} from '@/domain/church/metadata';
import { useI18n } from '@/utils/i18n';

// Estimate visual length so Korean text and long, unbroken addresses get enough room.
function textWidth(value: string) {
  return Array.from(value).reduce(
    (width, character) => width + (/[^\u0000-\u007f]/.test(character) ? 14 : 8),
    0,
  );
}

export function MemberMetadataTable({
  fields,
  header,
  editing = false,
  renderValue,
}: {
  fields: MemberMetadataField[];
  header?: ReactNode;
  editing?: boolean;
  renderValue: (field: MemberMetadataField) => ReactNode;
}) {
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const twoColumns = width / fontScale >= 720 && !editing;
  const labelWidth = Math.min(152, Math.max(96, width * 0.28));
  const shortValueWidth = width / 2 - labelWidth - 32 - 44;
  const rows: MemberMetadataField[][] = [];
  let pending: MemberMetadataField[] | null = null;

  for (const field of fields) {
    const value = formatMetadataValue(field, field.value);
    const fullWidth =
      !twoColumns ||
      value.includes('\n') ||
      textWidth(value) * fontScale > shortValueWidth ||
      textWidth(field.label) * fontScale > labelWidth - 24;
    if (fullWidth) {
      rows.push([field]);
      pending = null;
    } else if (pending) {
      pending.push(field);
      pending = null;
    } else {
      pending = [field];
      rows.push(pending);
    }
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="overflow-hidden rounded-2xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
    >
      {header}
      {rows.map((row, rowIndex) => (
        <View
          key={row[0].id}
          className={`flex-row items-stretch ${rowIndex > 0 || header ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}
        >
          {row.map((field, columnIndex) => (
            <View
              key={field.id}
              className={`min-w-0 flex-1 flex-row items-stretch ${columnIndex > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
            >
              <View
                style={{ width: labelWidth }}
                className="shrink-0 justify-center gap-2 border-r border-gray-200 bg-gray-50 px-3 py-4 dark:border-gray-700 dark:bg-gray-800/60"
              >
                <Text className="text-sm font-semibold leading-5 text-gray-700 dark:text-gray-200">
                  {field.label}
                </Text>
                <Text
                  accessibilityHint={t(
                    field.editPolicy === 'all_members'
                      ? 'metadata.allHint'
                      : 'metadata.privateHint',
                  )}
                  className="text-xs leading-4 text-gray-500 dark:text-gray-400"
                >
                  {t(
                    !field.isActive
                      ? 'metadata.inactive'
                      : field.editPolicy === 'all_members'
                        ? 'metadata.sharedVisibility'
                        : 'metadata.privateVisibility',
                  )}
                </Text>
                {field.isActive && !field.canEdit ? (
                  <Text
                    accessibilityHint={t(`metadata.policies.${field.editPolicy}`)}
                    className="text-xs leading-4 text-gray-500 dark:text-gray-400"
                  >
                    {t('metadata.readOnly')}
                  </Text>
                ) : null}
              </View>
              <View className="min-w-0 flex-1 justify-center px-3 py-3 sm:px-4">
                {renderValue(field)}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
