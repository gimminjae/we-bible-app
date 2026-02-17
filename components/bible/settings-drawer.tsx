import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useResponsive } from '@/hooks/use-responsive';
import { useCallback } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import type { VersionOption } from './types';

type SettingsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  dualLang: boolean;
  onDualLangChange: (value: boolean) => void;
  secondaryLang: string;
  versions: VersionOption[];
  primaryLang: string;
  onSecondaryLangChange: (val: string) => void;
  showSecondarySelector: boolean;
  onToggleSecondarySelector: () => void;
  onCloseSecondarySelector: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  fontSteps: readonly number[];
};

export function SettingsDrawer({
  isOpen,
  onClose,
  dualLang,
  onDualLangChange,
  secondaryLang,
  versions,
  primaryLang,
  onSecondaryLangChange,
  showSecondarySelector,
  onToggleSecondarySelector,
  onCloseSecondarySelector,
  fontScale,
  onFontScaleChange,
  fontSteps,
}: SettingsDrawerProps) {
  const { scale, moderateScale } = useResponsive();
  const handleDualLangValueChange = useCallback(
    (val: boolean) => {
      onDualLangChange(val);
      if (val && secondaryLang === primaryLang) {
        const fallback =
          (versions.find((v) => v.val !== primaryLang)?.val as 'ko' | 'en' | 'de') ?? 'ko';
        onSecondaryLangChange(fallback);
      }
    },
    [
      onDualLangChange,
      onSecondaryLangChange,
      primaryLang,
      secondaryLang,
      versions,
    ]
  );

  const handleSelectSecondaryLang = useCallback(
    (val: string) => {
      onSecondaryLangChange(val);
      onCloseSecondarySelector();
    },
    [onSecondaryLangChange, onCloseSecondarySelector]
  );

  const handleFontScalePress = useCallback(
    (step: number) => {
      onFontScaleChange(step);
    },
    [onFontScaleChange]
  );

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.75}>
      <View
        className="border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(8),
        }}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(18) }}
        >
          {''}
        </Text>
        <Pressable onPress={onClose} style={{ paddingHorizontal: scale(8), paddingVertical: scale(4) }}>
          <Text
            className="text-gray-600 dark:text-gray-400"
            style={{ fontSize: moderateScale(16) }}
          >
            ✕
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingVertical: scale(12),
        }}
        showsVerticalScrollIndicator
      >
        <View
          className="flex-row items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/50"
          style={{
            paddingVertical: scale(12),
            paddingHorizontal: scale(12),
            marginBottom: scale(16),
          }}
        >
          <Text
            className="font-medium text-gray-900 dark:text-white"
            style={{ fontSize: moderateScale(16) }}
          >
            이중언어모드
          </Text>
          <Switch
            value={dualLang}
            onValueChange={handleDualLangValueChange}
          />
        </View>

        {dualLang && (
          <View style={{ marginBottom: scale(16) }}>
            <Text
              className="font-medium text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(12), marginBottom: scale(8) }}
            >
              보조 언어
            </Text>
            <Pressable
              onPress={onToggleSecondarySelector}
              className="flex-row items-center justify-between rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              style={{ paddingHorizontal: scale(16), paddingVertical: scale(12) }}
            >
              <Text
                className="text-gray-900 dark:text-white"
                style={{ fontSize: moderateScale(16) }}
              >
                {versions.find((v) => v.val === secondaryLang)?.txt ?? 'English'}
              </Text>
              <Text className="text-gray-500 dark:text-gray-400">▾</Text>
            </Pressable>

            {showSecondarySelector && (
              <View
                className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                style={{ marginTop: scale(8) }}
              >
                {versions
                  .filter((v) => v.val !== primaryLang)
                  .map((opt) => (
                    <Pressable
                      key={opt.val}
                      onPress={() => handleSelectSecondaryLang(opt.val)}
                      className="active:bg-gray-200 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      style={{ paddingHorizontal: scale(16), paddingVertical: scale(12) }}
                    >
                      <Text
                        className="text-gray-900 dark:text-white"
                        style={{ fontSize: moderateScale(16) }}
                      >
                        {opt.txt} ({opt.description})
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        <View style={{ marginTop: scale(8) }}>
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: scale(12) }}
          >
            <Text
              className="font-medium text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(16) }}
            >
              글자 크기
            </Text>
            <Text
              className="font-semibold text-primary-600 dark:text-primary-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {Math.round(fontScale * 100)}%
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: scale(4) }}>
            {fontSteps.map((step) => (
              <Pressable
                key={step}
                onPress={() => handleFontScalePress(step)}
                className="flex-1 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
                style={{ height: scale(24) }}
              >
                <View
                  className={`h-full rounded-full ${fontScale >= step ? 'bg-primary-500' : ''}`}
                  style={{ width: fontScale >= step ? '100%' : '0%' }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
