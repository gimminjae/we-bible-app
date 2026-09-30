import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchMetadataDefinitions,
  fetchMemberMetadata,
  searchMembersByMetadata,
  type MetadataField,
  type MetadataValue,
} from '@/lib/church-metadata';

export const metadataKeys = {
  all: ['churches', 'metadata'] as const,
  church: (churchId: string) => ['churches', 'metadata', churchId] as const,
  fields: (churchId: string, actor: string) =>
    ['churches', 'metadata', churchId, actor, 'fields'] as const,
  member: (churchId: string, actor: string, target: string) =>
    ['churches', 'metadata', churchId, actor, 'member', target] as const,
};
function useMetadataSession() {
  const { dataUserId, currentUser, isConfigured } = useAuth();
  return {
    actor: currentUser?.id ?? '',
    enabled: Boolean(
      isConfigured && currentUser?.id && currentUser.id === dataUserId,
    ),
  };
}
function useMetadataRefresh(refetch: () => Promise<unknown>, enabled: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void refetch();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refetch();
      });
      return () => subscription.remove();
    }, [enabled, refetch]),
  );
}
function useDiscardFailedMetadata(queryKey: QueryKey, isError: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!isError) return;
    // Keep the failure/retry state, but discard any previously authorized response.
    const cached = client.getQueryCache().find({ queryKey, exact: true });
    if (cached?.state.data !== undefined)
      cached?.setState({ data: undefined, dataUpdatedAt: 0 });
  }, [client, isError, queryKey]);
}
export function useMetadataDefinitions(churchId: string, active = true) {
  const session = useMetadataSession();
  const enabled = session.enabled && Boolean(churchId) && active;
  const query = useQuery({
    queryKey: metadataKeys.fields(churchId, session.actor),
    queryFn: ({ signal }) => fetchMetadataDefinitions(churchId, signal),
    enabled,
    retry: false,
  });
  useMetadataRefresh(query.refetch, enabled);
  useDiscardFailedMetadata(
    metadataKeys.fields(churchId, session.actor),
    query.isError,
  );
  return {
    ...query,
    isUnavailable: !session.enabled,
    data: enabled && !query.isError ? query.data : undefined,
  };
}
export function useMemberMetadata(churchId: string, userId: string) {
  const session = useMetadataSession();
  const enabled = session.enabled && Boolean(churchId && userId);
  const query = useQuery({
    queryKey: metadataKeys.member(churchId, session.actor, userId),
    queryFn: ({ signal }) => fetchMemberMetadata(churchId, userId, signal),
    enabled,
    retry: false,
  });
  useMetadataRefresh(query.refetch, enabled);
  useDiscardFailedMetadata(
    metadataKeys.member(churchId, session.actor, userId),
    query.isError,
  );
  return {
    ...query,
    isUnavailable: !session.enabled,
    data: enabled && !query.isError ? query.data : undefined,
  };
}
export function useMetadataSearch(
  churchId: string,
  field: MetadataField | undefined,
  value: MetadataValue,
  active: boolean,
) {
  const session = useMetadataSession();
  const enabled =
    session.enabled && active && Boolean(field?.isActive) && value !== null;
  const query = useInfiniteQuery({
    queryKey: [
      ...metadataKeys.church(churchId),
      session.actor,
      'search',
      field?.id,
      field?.version,
      value,
    ],
    queryFn: ({ pageParam, signal }) =>
      searchMembersByMetadata(churchId, field!.id, value, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const count = pages.reduce((sum, page) => sum + page.items.length, 0);
      return count < last.total && last.items.length ? count : undefined;
    },
    enabled,
    retry: false,
  });
  useMetadataRefresh(query.refetch, enabled);
  useDiscardFailedMetadata(
    [
      ...metadataKeys.church(churchId),
      session.actor,
      'search',
      field?.id,
      field?.version,
      value,
    ],
    query.isError,
  );
  return {
    ...query,
    isUnavailable: !session.enabled,
    data: enabled && !query.isError ? query.data : undefined,
  };
}
export function useResetMetadata(churchId: string) {
  const client = useQueryClient();
  return useCallback(async () => {
    await client.cancelQueries({ queryKey: metadataKeys.church(churchId) });
    await client.resetQueries({ queryKey: metadataKeys.church(churchId) });
  }, [churchId, client]);
}
