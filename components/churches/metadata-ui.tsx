import { useState, type ReactNode } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';
import { useToast } from '@/contexts/toast-context';
import { copyToClipboard } from '@/utils/clipboard';
import {
  formatMetadataValue,
  type MetadataField,
  type MetadataValue,
} from '@/lib/church-metadata';

export const metadataInputClass =
  'rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
export function MetadataButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl px-4 py-3 ${secondary ? 'bg-gray-200 dark:bg-gray-800' : 'bg-primary-600'} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text
        className={`font-semibold ${secondary ? 'text-gray-900 dark:text-white' : 'text-white'}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function MetadataPage({
  title,
  onBack,
  children,
  right,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  right?: ReactNode;
}) {
  const { pageMaxWidth } = useResponsive();
  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={title} onBack={onBack} right={right} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 48,
          width: '100%',
          maxWidth: pageMaxWidth,
          alignSelf: 'center',
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function MetadataNotice({
  message,
  loading,
  onRetry,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      className="my-3 gap-3 rounded-xl bg-gray-100 p-4 dark:bg-gray-900"
      accessibilityLiveRegion="polite"
    >
      {loading ? <ActivityIndicator /> : null}
      <Text className="text-gray-700 dark:text-gray-300">{message}</Text>
      {onRetry ? (
        <MetadataButton secondary onPress={onRetry}>
          {t('metadata.retry')}
        </MetadataButton>
      ) : null}
    </View>
  );
}
export function MetadataInput({
  field,
  value,
  onChange,
  error,
  search = false,
  disabled = false,
}: {
  field: MetadataField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  search?: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [birthDateMax, setBirthDateMax] = useState<string>();

  return (
    <View className="gap-2">
      {field.dataType === 'binary' ? (
        <View className="flex-row flex-wrap gap-2">
          {field.options?.map((option) => (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{
                selected: value === option.value,
                disabled,
              }}
              className={`rounded-xl border px-5 py-3 ${value === option.value ? 'border-primary-500 bg-primary-100 dark:bg-primary-950' : 'border-gray-300 dark:border-gray-700'}`}
            >
              <Text className="text-gray-900 dark:text-white">
                {option.label}
              </Text>
            </Pressable>
          ))}
          {value ? (
            <MetadataButton
              secondary
              disabled={disabled}
              onPress={() => onChange('')}
            >
              {t('metadata.clear')}
            </MetadataButton>
          ) : null}
        </View>
      ) : field.dataType === 'date' && !search ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={field.label}
            accessibilityValue={{ text: value || t('metadata.emptyValue') }}
            accessibilityState={{ disabled, expanded: calendarOpen && !disabled }}
            disabled={disabled}
            onPress={() => {
              Keyboard.dismiss();
              // Match the existing validation and refresh the limit on each open.
              setBirthDateMax(
                field.systemKey === 'birth_date'
                  ? new Date(Date.now() + 9 * 60 * 60 * 1000)
                      .toISOString()
                      .slice(0, 10)
                  : undefined,
              );
              setCalendarOpen(true);
            }}
            className={`flex-row items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 ${disabled ? 'opacity-40' : ''}`}
          >
            <Text
              className={`min-w-0 flex-1 text-base ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
            >
              {value || 'YYYY-MM-DD'}
            </Text>
            <IconSymbol name="calendar" size={20} color="#9ca3af" />
          </Pressable>
          {value ? (
            <View className="self-start">
              <MetadataButton
                secondary
                disabled={disabled}
                onPress={() => onChange('')}
              >
                {t('metadata.clear')}
              </MetadataButton>
            </View>
          ) : null}
          <DatePickerModal
            visible={calendarOpen && !disabled}
            title={field.label}
            value={value}
            initialDate={birthDateMax}
            maxDate={birthDateMax}
            onSelect={(date) => {
              if (!disabled) onChange(date);
            }}
            onClose={() => setCalendarOpen(false)}
          />
        </>
      ) : (
        <TextInput
          accessibilityLabel={field.label}
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          className={metadataInputClass}
          placeholderTextColor="#9ca3af"
          placeholder={
            field.dataType === 'date'
              ? 'YYYY-MM-DD'
              : search
                ? t('metadata.searchPlaceholder')
                : t('metadata.emptyValue')
          }
          autoCapitalize={field.dataType === 'email' ? 'none' : 'sentences'}
          autoCorrect={field.dataType === 'text'}
          keyboardType={
            field.dataType === 'email'
              ? 'email-address'
              : field.dataType === 'phone'
                ? 'phone-pad'
                : ['number', 'date'].includes(field.dataType) &&
                    Platform.OS === 'ios'
                  ? 'numbers-and-punctuation'
                  : 'default'
          }
          multiline={!search && field.dataType === 'text'}
          textAlignVertical="top"
        />
      )}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function MetadataValueView({
  field,
  value,
  compact = false,
}: {
  field: MetadataField;
  value: MetadataValue;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const text = formatMetadataValue(field, value);
  return (
    <View
      className={`min-w-0 flex-row ${compact ? 'items-center gap-1' : 'items-start gap-3'}`}
    >
      <Text
        className={`min-w-0 flex-1 text-base leading-6 ${text ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
        selectable
      >
        {text || t('metadata.emptyValue')}
      </Text>
      {field.isActive && field.isCopyable && text !== '' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('metadata.copyLabel').replace(
            '{field}',
            field.label,
          )}
          onPress={() => {
            void copyToClipboard(text)
              .then(() => showToast(t('toast.copySuccess')))
              .catch(() => showToast(t('metadata.copyFailed')));
          }}
          className={
            compact
              ? 'min-h-11 w-11 shrink-0 items-center justify-center rounded-lg active:bg-gray-100 dark:active:bg-gray-800'
              : 'shrink-0 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800'
          }
        >
          {compact ? (
            <IconSymbol name="doc.on.doc" size={17} color="#9ca3af" />
          ) : (
            <Text className="text-primary-600 dark:text-primary-400">
              {t('common.copy')}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
export function confirmMetadataDiscard(
  t: (key: string) => string,
): Promise<boolean> {
  if (Platform.OS === 'web')
    return Promise.resolve(globalThis.confirm(t('metadata.discard')));
  return new Promise((resolve) =>
    Alert.alert(
      '',
      t('metadata.discard'),
      [
        {
          text: t('metadata.cancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: t('metadata.discardAction'),
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
