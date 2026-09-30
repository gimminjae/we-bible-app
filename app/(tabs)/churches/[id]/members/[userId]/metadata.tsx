import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { MemberMetadataTable } from '@/components/churches/member-metadata-table';
import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  MetadataButton,
  MetadataInput,
  MetadataNotice,
  MetadataPage,
  MetadataValueView,
  confirmMetadataDiscard,
} from '@/components/churches/metadata-ui';
import {
  useMemberMetadata,
  useResetMetadata,
} from '@/hooks/use-church-metadata';
import { useChurchDetail } from '@/hooks/use-churches';
import { useToast } from '@/contexts/toast-context';
import { useI18n } from '@/utils/i18n';
import {
  buildMetadataPatch,
  metadataErrorMessage,
  saveMemberMetadata,
  type MemberMetadata,
} from '@/lib/church-metadata';

type Editor = { snapshot: MemberMetadata; draft: Record<string, string> };
export default function MemberMetadataScreen() {
  const { id = '', userId = '' } = useLocalSearchParams<{
    id: string;
    userId: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { showToast } = useToast();
  const query = useMemberMetadata(id, userId);
  const { churchDetail } = useChurchDetail(id);
  const reset = useResetMetadata(id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);
  const [archive, setArchive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saving = useRef(false);
  const changes = useMemo(
    () =>
      editor ? buildMetadataPatch(editor.snapshot.fields, editor.draft) : null,
    [editor],
  );
  const dirty =
    !!editor &&
    editor.snapshot.fields.some(
      (field) => (editor.draft[field.id] ?? '') !== String(field.value ?? ''),
    );
  const stale =
    !!editor &&
    !!query.data &&
    (editor.snapshot.version !== query.data.version ||
      editor.snapshot.fields.some(
        (field) =>
          field.version !==
          query.data!.fields.find((f) => f.id === field.id)?.version,
      ));
  usePreventRemove(dirty || busy, ({ data }) => {
    if (saving.current) return;
    void confirmMetadataDiscard(t).then((discard) => {
      if (discard) {
        setEditor(null);
        navigation.dispatch(data.action);
      }
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
  // Clear drafts immediately when server permissions change, before rendering the new snapshot.
  const [lastData, setLastData] = useState(query.data);
  if (query.data !== lastData) {
    setLastData(query.data);
    if (
      editor &&
      (!query.data ||
        editor.snapshot.fields.some((field) => {
          const current = query.data!.fields.find((f) => f.id === field.id);
          return !current || current.canEdit !== field.canEdit;
        }))
    ) {
      setEditor(null);
      setConflict(true);
    }
  }
  const reload = async () => {
    if (dirty && !(await confirmMetadataDiscard(t))) return;
    setEditor(null);
    setError(null);
    setConflict(false);
    await reset();
  };
  const save = async () => {
    if (!editor || !changes || saving.current || stale || conflict) return;
    setSubmitted(true);
    if (Object.keys(changes.errors).length) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveMemberMetadata(
        id,
        userId,
        editor.snapshot.version,
        changes.patch,
        changes.versions,
      );
      setEditor(null);
      setSubmitted(false);
      showToast(t('metadata.saved'));
      await reset();
    } catch (cause) {
      setError(cause);
      if (
        cause instanceof Error &&
        [
          'METADATA_CONFLICT',
          'METADATA_FIELD_INACTIVE',
          'PERMISSION_DENIED',
        ].includes(cause.message)
      ) {
        setConflict(true);
        await query.refetch();
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const fields = query.data?.fields ?? [];
  const active = fields.filter((field) => field.isActive);
  const archived = fields.filter(
    (field) => !field.isActive && field.value !== null,
  );
  const member = churchDetail?.members.find((member) => member.userId === userId);
  return (
    <MetadataPage
      title={t('metadata.memberInfo')}
      onBack={() => router.back()}
    >
      {query.isUnavailable ? (
        <MetadataNotice message={t('metadata.errors.PERMISSION_DENIED')} />
      ) : query.isError ? (
        <MetadataNotice
          message={metadataErrorMessage(query.error, t)}
          onRetry={() => void reload()}
        />
      ) : !query.data ? (
        <MetadataNotice loading message={t('metadata.loading')} />
      ) : (
        <View className="gap-4">
          <Text className="text-sm leading-5 text-gray-500 dark:text-gray-400">
            {t('metadata.optional')}
          </Text>
          {conflict || stale ? (
            <MetadataNotice
              message={t('metadata.changed')}
              onRetry={() => void reload()}
            />
          ) : null}
          {!fields.length ? (
            <MetadataNotice message={t('metadata.noReadable')} />
          ) : !active.length ? (
            <MetadataNotice message={t('metadata.noActive')} />
          ) : null}
          <MemberMetadataTable
            fields={active}
            editing={!!editor}
            header={
              <View className="flex-row items-center gap-4 p-5">
                <View className="h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  {member?.profile.avatarUrl ? (
                    <Image
                      source={{ uri: member.profile.avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      accessibilityLabel={member.profile.displayName}
                    />
                  ) : (
                    <IconSymbol
                      name="person.crop.circle"
                      size={36}
                      color="#9ca3af"
                    />
                  )}
                </View>
                <View className="min-w-0 flex-1 gap-2">
                  <Text className="text-xl font-bold leading-7 text-gray-900 dark:text-white">
                    {member?.profile.displayName || t('metadata.memberInfo')}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-2">
                    {member ? <ChurchRoleBadge role={member.role} /> : null}
                    <Text className="shrink text-sm leading-5 text-gray-500 dark:text-gray-400">
                      {[churchDetail?.church.name, member?.teamName]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              </View>
            }
            renderValue={(field) =>
              editor && field.canEdit ? (
                <MetadataInput
                  field={field}
                  value={editor.draft[field.id] ?? ''}
                  disabled={busy || stale || conflict}
                  onChange={(value) => {
                    setError(null);
                    setEditor((previous) =>
                      previous
                        ? {
                            ...previous,
                            draft: { ...previous.draft, [field.id]: value },
                          }
                        : null,
                    );
                  }}
                  error={
                    submitted && changes?.errors[field.id]
                      ? metadataErrorMessage(
                          new Error(changes.errors[field.id]),
                          t,
                        )
                      : undefined
                  }
                />
              ) : (
                <MetadataValueView
                  compact
                  field={editor ? { ...field, isCopyable: false } : field}
                  value={field.value}
                />
              )
            }
          />
          {error ? (
            <MetadataNotice message={metadataErrorMessage(error, t)} />
          ) : null}
          {editor ? (
            <View className="gap-2">
              <MetadataButton
                disabled={busy || stale || conflict || !dirty}
                onPress={() => void save()}
              >
                {t(busy ? 'metadata.saving' : 'metadata.save')}
              </MetadataButton>
              <MetadataButton
                secondary
                disabled={busy}
                onPress={() => {
                  void (async () => {
                    if (!dirty || (await confirmMetadataDiscard(t))) {
                      setEditor(null);
                      setSubmitted(false);
                      setError(null);
                    }
                  })();
                }}
              >
                {t('metadata.cancel')}
              </MetadataButton>
            </View>
          ) : active.some((field) => field.canEdit) ? (
            <MetadataButton
              onPress={() => {
                setConflict(false);
                setError(null);
                setSubmitted(false);
                setEditor({
                  snapshot: query.data!,
                  draft: Object.fromEntries(
                    fields.map((field) => [
                      field.id,
                      String(field.value ?? ''),
                    ]),
                  ),
                });
              }}
            >
              {t('metadata.edit')}
            </MetadataButton>
          ) : null}
          {archived.length ? (
            <View className="gap-3">
              <MetadataButton secondary onPress={() => setArchive(!archive)}>
                {t('metadata.archive')} ({archived.length})
              </MetadataButton>
              {archive ? (
                <MemberMetadataTable
                  fields={archived}
                  renderValue={(field) => (
                    <MetadataValueView compact field={field} value={field.value} />
                  )}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </MetadataPage>
  );
}
