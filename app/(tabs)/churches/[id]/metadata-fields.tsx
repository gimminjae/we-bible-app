import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  MetadataButton,
  MetadataNotice,
  MetadataPage,
  metadataInputClass,
  confirmMetadataDiscard,
} from '@/components/churches/metadata-ui';
import {
  useMetadataDefinitions,
  useResetMetadata,
} from '@/hooks/use-church-metadata';
import { useToast } from '@/contexts/toast-context';
import { useI18n } from '@/utils/i18n';
import {
  METADATA_TYPES,
  METADATA_POLICIES,
  metadataErrorMessage,
  saveMetadataField,
  validateMetadataDefinition,
  type MetadataField,
  type MetadataFieldInput,
  type MetadataRole,
} from '@/lib/church-metadata';

function FieldEditor({
  churchId,
  field,
  role,
  stale,
  onClose,
  onSaved,
  onRefresh,
}: {
  churchId: string;
  field?: MetadataField;
  role: MetadataRole;
  stale: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onRefresh: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [input, setInput] = useState<MetadataFieldInput>(() =>
    field
      ? { ...field }
      : {
          label: '',
          dataType: 'text',
          options: null,
          isActive: true,
          isCopyable: false,
          editPolicy: 'self_and_admins',
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [dirty, setDirty] = useState(false);
  const saving = useRef(false);
  const navigation = useNavigation();
  usePreventRemove(dirty || busy, ({ data }) => {
    if (saving.current) return;
    void confirmMetadataDiscard(t).then((discard) => {
      if (discard) navigation.dispatch(data.action);
    });
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || (!dirty && !busy)) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    globalThis.addEventListener('beforeunload', handler);
    return () => globalThis.removeEventListener('beforeunload', handler);
  }, [dirty, busy]);
  const change = (patch: Partial<MetadataFieldInput>) => {
    setDirty(true);
    setError(null);
    setInput((previous) => ({ ...previous, ...patch }));
  };
  const close = async () => {
    if (!busy && (!dirty || (await confirmMetadataDiscard(t)))) onClose();
  };
  const save = async () => {
    if (saving.current || stale) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      validateMetadataDefinition(input);
      await saveMetadataField(churchId, input, field);
      showToast(t('metadata.fieldSaved'));
      await onSaved();
    } catch (cause) {
      setError(cause);
      if (
        cause instanceof Error &&
        ['METADATA_CONFLICT', 'PERMISSION_DENIED'].includes(cause.message)
      )
        await onRefresh();
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <BottomSheet visible onClose={() => void close()} heightFraction={0.9}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t(field ? 'metadata.editField' : 'metadata.add')}
        </Text>
        {stale ? <MetadataNotice message={t('metadata.changed')} /> : null}
        <Text className="font-semibold text-gray-900 dark:text-white">
          {t('metadata.label')}
        </Text>
        <TextInput
          className={metadataInputClass}
          accessibilityLabel={t('metadata.label')}
          value={input.label}
          onChangeText={(label) => change({ label })}
          editable={!busy}
        />
        <Text className="font-semibold text-gray-900 dark:text-white">
          {t('metadata.type')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {METADATA_TYPES.map((type) => (
            <MetadataButton
              key={type}
              secondary={input.dataType !== type}
              disabled={!!field || busy}
              onPress={() =>
                change({
                  dataType: type,
                  options:
                    type === 'binary'
                      ? [
                          { value: 'option_1', label: 'O' },
                          { value: 'option_2', label: 'X' },
                        ]
                      : null,
                  isCopyable: ['phone', 'email'].includes(type),
                })
              }
            >
              {t(`metadata.types.${type}`)}
            </MetadataButton>
          ))}
        </View>
        {input.dataType === 'binary' ? (
          <View className="gap-3">
            {input.options?.map((option, i) => (
              <TextInput
                key={option.value}
                className={metadataInputClass}
                accessibilityLabel={t(
                  i === 0 ? 'metadata.firstOption' : 'metadata.secondOption',
                )}
                placeholder={t(
                  i === 0 ? 'metadata.firstOption' : 'metadata.secondOption',
                )}
                value={option.label}
                editable={!busy}
                onChangeText={(label) =>
                  change({
                    options: input.options!.map((o, j) =>
                      j === i ? { ...o, label } : o,
                    ),
                  })
                }
              />
            ))}
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('metadata.optionHint')}
            </Text>
          </View>
        ) : null}
        <Text className="font-semibold text-gray-900 dark:text-white">
          {t('metadata.policy')}
        </Text>
        <View className="gap-2">
          {METADATA_POLICIES.map((policy) => (
            <MetadataButton
              key={policy}
              secondary={input.editPolicy !== policy}
              disabled={role !== 'super_admin' || busy}
              onPress={() => change({ editPolicy: policy })}
            >
              {t(`metadata.policies.${policy}`)}
            </MetadataButton>
          ))}
        </View>
        {role !== 'super_admin' ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('metadata.policyAdminHint')}
          </Text>
        ) : null}
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t(
            input.editPolicy === 'all_members'
              ? 'metadata.allHint'
              : input.editPolicy === 'self_and_admins'
                ? 'metadata.selfHint'
                : 'metadata.privateHint',
          )}
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-gray-900 dark:text-white">
            {t('metadata.copyEnabled')}
          </Text>
          <Switch
            accessibilityLabel={t('metadata.copyEnabled')}
            value={input.isCopyable}
            disabled={busy}
            onValueChange={(isCopyable) => change({ isCopyable })}
          />
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t('metadata.copyHint')}
        </Text>
        {field ? (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900 dark:text-white">
                {t('metadata.active')}
              </Text>
              <Switch
                accessibilityLabel={t('metadata.active')}
                value={input.isActive}
                disabled={busy}
                onValueChange={(isActive) => change({ isActive })}
              />
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('metadata.inactiveHint')}
            </Text>
          </>
        ) : null}
        {error ? (
          <MetadataNotice message={metadataErrorMessage(error, t)} />
        ) : null}
        <MetadataButton disabled={busy || stale} onPress={() => void save()}>
          {t(busy ? 'metadata.saving' : 'metadata.save')}
        </MetadataButton>
        <MetadataButton secondary disabled={busy} onPress={() => void close()}>
          {t('metadata.cancel')}
        </MetadataButton>
      </ScrollView>
    </BottomSheet>
  );
}

export default function MetadataFieldsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const query = useMetadataDefinitions(id);
  const reset = useResetMetadata(id);
  const [editor, setEditor] = useState<{ field?: MetadataField } | null>(null);
  const allowed =
    query.data?.role === 'super_admin' || query.data?.role === 'deputy_admin';
  return (
    <MetadataPage title={t('metadata.manage')} onBack={() => router.back()}>
      {query.isUnavailable ? (
        <MetadataNotice message={t('metadata.errors.PERMISSION_DENIED')} />
      ) : query.isError ? (
        <MetadataNotice
          message={metadataErrorMessage(query.error, t)}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <MetadataNotice loading message={t('metadata.loading')} />
      ) : !allowed ? (
        <MetadataNotice message={t('metadata.errors.PERMISSION_DENIED')} />
      ) : (
        <View className="gap-4">
          <MetadataButton onPress={() => setEditor({})}>
            {t('metadata.add')}
          </MetadataButton>
          {!query.data.fields.length ? (
            <MetadataNotice message={t('metadata.emptyFields')} />
          ) : null}
          {query.data.fields.map((field) => (
            <View
              key={field.id}
              className="gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {field.label}
                </Text>
                <Text
                  className={
                    field.isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500'
                  }
                >
                  {t(field.isActive ? 'metadata.active' : 'metadata.inactive')}
                </Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t(`metadata.types.${field.dataType}`)}
                {field.systemKey ? ` · ${t('metadata.defaultField')}` : ''}
                {field.isCopyable ? ` · ${t('metadata.copyEnabled')}` : ''}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t(`metadata.policies.${field.editPolicy}`)}
              </Text>
              <MetadataButton secondary onPress={() => setEditor({ field })}>
                {t('metadata.editField')}
              </MetadataButton>
            </View>
          ))}
        </View>
      )}
      {editor && allowed && query.data ? (
        <FieldEditor
          churchId={id}
          field={editor.field}
          role={query.data.role}
          stale={
            !!editor.field &&
            editor.field.version !==
              query.data.fields.find((f) => f.id === editor.field!.id)?.version
          }
          onClose={() => setEditor(null)}
          onRefresh={query.refetch}
          onSaved={async () => {
            setEditor(null);
            await reset();
          }}
        />
      ) : null}
    </MetadataPage>
  );
}
