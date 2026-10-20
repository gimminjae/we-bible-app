import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { AppIcon, type AppIconName } from '@/components/ui/feature';
import { appColors, featureColors, type FeatureTone } from '@/constants/app-design';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';

function TabIcon({ name, tone, focused, size }: {
  name: AppIconName;
  tone: FeatureTone;
  focused: boolean;
  size: number;
}) {
  const { theme } = useAppSettings();
  return (
    <View style={{
      width: 52,
      height: 34,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? featureColors[tone][theme].soft : 'transparent',
    }}>
      <AppIcon name={name} size={size} color={focused ? featureColors[tone][theme].ink : appColors[theme].muted} />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useAppSettings();
  const { t } = useI18n();
  const { moderateScale, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const iconSize = isTablet ? moderateScale(22, 0.3) : 24;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: featureColors.bible[theme].ink,
        tabBarInactiveTintColor: appColors[theme].muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: isTablet ? 12 : 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: appColors[theme].surface,
          borderTopColor: appColors[theme].border,
          paddingTop: 8,
          height: (isTablet ? 76 : 64) + insets.bottom,
          paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.bible'),
          tabBarIcon: ({ focused }) => <TabIcon size={iconSize} name={focused ? 'book' : 'book-outline'} tone="bible" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="churches"
        options={{
          title: t('tabs.church'),
          tabBarActiveTintColor: featureColors.community[theme].ink,
          tabBarIcon: ({ focused }) => <TabIcon size={iconSize} name={focused ? 'people' : 'people-outline'} tone="community" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: t('tabs.mypage'),
          tabBarActiveTintColor: featureColors.prayer[theme].ink,
          tabBarIcon: ({ focused }) => <TabIcon size={iconSize} name={focused ? 'person-circle' : 'person-circle-outline'} tone="prayer" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarActiveTintColor: featureColors.settings[theme].ink,
          tabBarIcon: ({ focused }) => <TabIcon size={iconSize} name={focused ? 'settings' : 'settings-outline'} tone="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
