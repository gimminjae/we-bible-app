import { useState, type ReactNode } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ChurchRoleBadge } from '@/components/churches/role-badge';
import {
  MetadataButton,
  MetadataInput,
  MetadataNotice,
  MetadataValueView,
  metadataInputClass,
} from '@/components/churches/metadata-ui';
import {
  useMetadataDefinitions,
  useMetadataSearch,
} from '@/hooks/use-church-metadata';
import {
  metadataErrorMessage,
  parseMetadataValue,
  type MetadataValue,
} from '@/lib/church-metadata';
import { useI18n } from '@/utils/i18n';

type Search = { fieldId: string; version: number; value: MetadataValue };
export function MemberMetadataSearch({
  churchId,
  definitions,
  children,
}: {
  churchId: string;
  definitions: ReturnType<typeof useMetadataDefinitions>;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [fieldId, setFieldId] = useState('');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState<Search | null>(null);
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<unknown>(null);
  const field = definitions.data?.fields.find(
    (f) => f.id === fieldId && f.isActive,
  );
  const searching =
    !!search &&
    search.fieldId === field?.id &&
    search.version === field.version;
  const results = useMetadataSearch(
    churchId,
    field,
    search?.value ?? null,
    searching,
  );
  if (search && (!field || search.version !== field.version)) {
    setSearch(null);
    setError(
      new Error(field ? 'METADATA_CONFLICT' : 'METADATA_FIELD_INACTIVE'),
    );
  }
  const submit = () => {
    if (!field) return;
    setError(null);
    try {
      const value = parseMetadataValue(field, input, true);
      if (value === null) {
        setSearch(null);
        return;
      }
      setSearch({ fieldId: field.id, version: field.version, value });
      if (searching && search?.value === value) void results.refetch();
    } catch (cause) {
      setError(cause);
    }
  };
  const active = definitions.data?.fields.filter((f) => f.isActive) ?? [];
  const items = results.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <View className="mb-4 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          {t('metadata.searchTitle')}
        </Text>
        {definitions.isError ? (
          <MetadataNotice
            message={metadataErrorMessage(definitions.error, t)}
            onRetry={() => void definitions.refetch()}
          />
        ) : !definitions.data ? (
          <MetadataNotice loading message={t('metadata.loading')} />
        ) : !active.length ? (
          <Text className="text-gray-500 dark:text-gray-400">
            {t('metadata.noActive')}
          </Text>
        ) : (
          <MetadataButton
            secondary
            onPress={() => {
              setFilter('');
              setPicker(true);
            }}
          >
            {field?.label ?? t('metadata.selectField')}
          </MetadataButton>
        )}
        {field ? (
          <>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t(
                definitions.data?.role !== 'member' ||
                  field.editPolicy === 'all_members'
                  ? 'metadata.wholeCommunity'
                  : 'metadata.selfOnly',
              )}
            </Text>
            <MetadataInput
              field={field}
              value={input}
              onChange={(value) => {
                setInput(value);
                setSearch(null);
                setError(null);
              }}
              search
            />
            <View className="flex-row flex-wrap gap-2">
              <MetadataButton disabled={results.isFetching} onPress={submit}>
                {t('metadata.search')}
              </MetadataButton>
              <MetadataButton
                secondary
                onPress={() => {
                  setSearch(null);
                  setInput('');
                  setFieldId('');
                  setError(null);
                }}
              >
                {t('metadata.reset')}
              </MetadataButton>
            </View>
          </>
        ) : null}
        {error ? (
          <MetadataNotice message={metadataErrorMessage(error, t)} />
        ) : null}
      </View>
      {searching ? (
        results.isError ? (
          <MetadataNotice
            message={metadataErrorMessage(results.error, t)}
            onRetry={() => void results.refetch()}
          />
        ) : !results.data ? (
          <MetadataNotice loading message={t('metadata.searching')} />
        ) : (
          <View className="gap-4">
            <Text
              accessibilityLiveRegion="polite"
              className="font-semibold text-gray-700 dark:text-gray-300"
            >
              {t('metadata.resultCount').replace(
                '{count}',
                String(results.data.pages[0].total),
              )}
            </Text>
            {!items.length ? (
              <MetadataNotice message={t('metadata.noResults')} />
            ) : null}
            {items.map((item) => (
              <View
                key={item.userId}
                className="gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="flex-1 font-semibold text-gray-900 dark:text-white">
                    {item.displayName}
                  </Text>
                  <ChurchRoleBadge role={item.role} />
                </View>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.teamName ?? t('church.noTeamAssigned')}
                </Text>
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {field!.label}
                </Text>
                <MetadataValueView field={field!} value={item.value} />
                <MetadataButton
                  secondary
                  onPress={() =>
                    router.push(
                      `/churches/${churchId}/members/${item.userId}/metadata` as never,
                    )
                  }
                >
                  {t('metadata.memberInfo')}
                </MetadataButton>
              </View>
            ))}
            {results.hasNextPage ? (
              <MetadataButton
                secondary
                disabled={results.isFetchingNextPage}
                onPress={() => void results.fetchNextPage()}
              >
                {t('metadata.more')}
              </MetadataButton>
            ) : null}
          </View>
        )
      ) : (
        children
      )}
      <BottomSheet
        visible={picker}
        onClose={() => setPicker(false)}
        heightFraction={0.65}
      >
        <View className="flex-1 gap-3 p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('metadata.selectField')}
          </Text>
          <TextInput
            className={metadataInputClass}
            accessibilityLabel={t('metadata.fieldSearch')}
            placeholder={t('metadata.fieldSearch')}
            value={filter}
            onChangeText={setFilter}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8 }}
          >
            {active
              .filter((f) =>
                f.label
                  .toLocaleLowerCase()
                  .includes(filter.trim().toLocaleLowerCase()),
              )
              .map((f) => (
                <MetadataButton
                  key={f.id}
                  secondary={fieldId !== f.id}
                  onPress={() => {
                    setFieldId(f.id);
                    setInput('');
                    setSearch(null);
                    setError(null);
                    setPicker(false);
                  }}
                >
                  {f.label}
                </MetadataButton>
              ))}
          </ScrollView>
        </View>
      </BottomSheet>
    </>
  );
}
