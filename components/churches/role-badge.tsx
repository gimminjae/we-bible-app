import { Text, View } from 'react-native';

import type { ChurchRole } from '@/lib/church';
import { useI18n } from '@/utils/i18n';

export function ChurchRoleBadge({ role }: { role: ChurchRole }) {
  const { t } = useI18n();

  const palette =
    role === 'super_admin'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
      : role === 'deputy_admin'
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
        : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <View className={`rounded-full px-3 py-1 ${palette}`}>
      <Text className="text-xs font-semibold">{t(`church.role.${role}`)}</Text>
    </View>
  );
}
