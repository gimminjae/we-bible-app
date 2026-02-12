import { BottomSheet } from '@/components/ui/bottom-sheet';
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
      <View className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">{''}</Text>
        <Pressable onPress={onClose} className="px-2 py-1">
          <Text className="text-base text-gray-600 dark:text-gray-400">✕</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        showsVerticalScrollIndicator
      >
        <View className="flex-row items-center justify-between py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3 mb-4">
          <Text className="text-base font-medium text-gray-900 dark:text-white">
            이중언어모드
          </Text>
          <Switch
            value={dualLang}
            onValueChange={handleDualLangValueChange}
          />
        </View>

        {dualLang && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              보조 언어
            </Text>
            <Pressable
              onPress={onToggleSecondarySelector}
              className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <Text className="text-base text-gray-900 dark:text-white">
                {versions.find((v) => v.val === secondaryLang)?.txt ?? 'English'}
              </Text>
              <Text className="text-gray-500 dark:text-gray-400">▾</Text>
            </Pressable>

            {showSecondarySelector && (
              <View className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {versions
                  .filter((v) => v.val !== primaryLang)
                  .map((opt) => (
                    <Pressable
                      key={opt.val}
                      onPress={() => handleSelectSecondaryLang(opt.val)}
                      className="px-4 py-3 active:bg-gray-200 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <Text className="text-base text-gray-900 dark:text-white">
                        {opt.txt} ({opt.description})
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-medium text-gray-900 dark:text-white">글자 크기</Text>
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {Math.round(fontScale * 100)}%
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            {fontSteps.map((step) => (
              <Pressable
                key={step}
                onPress={() => handleFontScalePress(step)}
                className="flex-1 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
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
