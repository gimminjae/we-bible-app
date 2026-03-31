import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { moderateScale } = useResponsive();
  const iconSize = moderateScale(28);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.bible'),
          tabBarIcon: ({ color }) => <IconSymbol size={iconSize} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="churches"
        options={{
          title: t('tabs.church'),
          tabBarIcon: ({ color }) => <MaterialIcons size={iconSize} name="groups" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: t('tabs.mypage'),
          tabBarIcon: ({ color }) => <IconSymbol size={iconSize} name="person.crop.circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={iconSize} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
