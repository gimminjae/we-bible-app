import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { AppIcon, FeatureIcon, type AppIconName } from '@/components/ui/feature';
import type { FeatureTone } from '@/constants/app-design';
import { useI18n } from '@/utils/i18n';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  titleAccessory?: ReactNode;
  right?: ReactNode;
  icon?: AppIconName;
  tone?: FeatureTone;
  stackActions?: boolean;
};

export function ScreenHeader({
  title,
  onBack,
  titleAccessory,
  right,
  icon,
  tone = 'bible',
  stackActions = false,
}: ScreenHeaderProps) {
  const { pageMaxWidth } = useResponsive();
  const { t } = useI18n();

  return (
    <View className="px-4 pb-3 pt-4">
      <View
        className={stackActions ? "gap-3" : "flex-row items-center justify-between"}
        style={{ width: '100%', maxWidth: pageMaxWidth, alignSelf: 'center' }}
      >
        <View className={`${stackActions ? 'w-full' : 'flex-1'} min-w-0 flex-row items-center`}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              className="mr-3 h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <AppIcon name="arrow-back" tone={tone} size={20} />
            </Pressable>
          ) : null}
          {icon ? (
            <View className="mr-3">
              <FeatureIcon name={icon} tone={tone} size={38} />
            </View>
          ) : null}
          <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
            <Text
              accessibilityRole="header"
              numberOfLines={right && !stackActions ? 2 : undefined}
              className="shrink text-xl font-bold text-gray-900 dark:text-white"
            >
              {title}
            </Text>
            {titleAccessory ? <View className="shrink-0">{titleAccessory}</View> : null}
          </View>
        </View>
        {right ? (
          <View className={`${stackActions ? 'flex-wrap' : 'ml-3 shrink-0'} flex-row items-center gap-2`}>
            {right}
          </View>
        ) : null}
      </View>
    </View>
  );
}
