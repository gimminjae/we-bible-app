import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  type QueryKey,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getPost,
  listComments,
  listPosts,
  resolveAttachments,
} from "@/lib/church-community";
import type { Cursor } from "@/domain/community/types";

export const communityKeys = {
  church: (id: string) => ["churches", "community", id] as const,
  scope: (id: string, actor: string) =>
    ["churches", "community", id, actor] as const,
};
export function useCommunitySession() {
  const { currentUser, dataUserId, isConfigured } = useAuth();
  return {
    actor: currentUser?.id ?? "",
    enabled: Boolean(
      isConfigured && currentUser?.id && currentUser.id === dataUserId,
    ),
  };
}
function useRefresh(
  refetch: () => Promise<unknown>,
  enabled: boolean,
  key: QueryKey,
  error: boolean,
) {
  const client = useQueryClient();
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    void refetch();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => listener.remove();
  }, [enabled, refetch]));
  useEffect(() => {
    if (error) {
      client.getQueryCache().find({ queryKey: key, exact: true })?.setState({
        data: undefined,
        dataUpdatedAt: 0,
      });
    }
  }, [client, error, key]);
}
export function useCommunityPosts(church: string, tag: string) {
  const session = useCommunitySession();
  const key = [...communityKeys.scope(church, session.actor), "posts", tag];
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) =>
      listPosts(church, tag, pageParam, signal),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: session.enabled && !!church,
    retry: false,
  });
  useRefresh(query.refetch, session.enabled, key, query.isError);
  return {
    ...query,
    data: session.enabled && !query.isError ? query.data : undefined,
    unavailable: !session.enabled,
  };
}
export function useCommunityPost(church: string, post: string) {
  const session = useCommunitySession();
  const key = [...communityKeys.scope(church, session.actor), "post", post];
  const enabled = session.enabled && !!church && !!post;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getPost(church, post, signal),
    enabled,
    retry: false,
  });
  useRefresh(query.refetch, enabled, key, query.isError);
  return {
    ...query,
    data: enabled && !query.isError ? query.data : undefined,
    unavailable: !session.enabled,
  };
}
export function useCommunityComments(
  church: string,
  post: string,
  active: boolean,
) {
  const session = useCommunitySession();
  const key = [...communityKeys.scope(church, session.actor), "comments", post];
  const enabled = session.enabled && active;
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) =>
      listComments(church, post, pageParam, signal),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    retry: false,
  });
  useRefresh(query.refetch, enabled, key, query.isError);
  return { ...query, data: enabled && !query.isError ? query.data : undefined };
}
export function useCommunityAttachments(church: string, ids: string[]) {
  const session = useCommunitySession();
  const sorted = [...ids].sort();
  const query = useQuery({
    queryKey: [
      ...communityKeys.scope(church, session.actor),
      "attachments",
      sorted,
    ],
    queryFn: async () => {
      const chunks = Array.from(
        { length: Math.ceil(sorted.length / 10) },
        (_, index) => sorted.slice(index * 10, index * 10 + 10),
      );
      return (await Promise.all(
        chunks.map((ids) => resolveAttachments(church, ids)),
      )).flat();
    },
    enabled: session.enabled && sorted.length > 0,
    refetchInterval: 240000,
    refetchOnWindowFocus: "always",
    staleTime: 180000,
    retry: false,
  });
  return {
    ...query,
    urls: Object.fromEntries(
      (session.enabled && !query.isError ? query.data ?? [] : []).map(
        (item) => [item.id, item.url],
      ),
    ),
  };
}
export function useRefreshCommunity(church: string) {
  const client = useQueryClient();
  return useCallback(
    () => client.invalidateQueries({ queryKey: communityKeys.church(church) }),
    [church, client],
  );
}
