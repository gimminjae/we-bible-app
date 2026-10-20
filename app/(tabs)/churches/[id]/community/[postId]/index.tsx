import { useAppSettings } from "@/contexts/app-settings";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import type { Comment, Post } from "@/domain/community/types";
import { communityError, rangeLabel } from "@/domain/community/validation";
import { communityRpc, resolveAttachments } from "@/lib/church-community";
import {
  useCommunityAttachments,
  useCommunityComments,
  useCommunityPost,
  useCommunitySession,
  useRefreshCommunity,
} from "@/hooks/use-community";
import { useToast } from "@/contexts/toast-context";
import RichEditor from "@/components/community/rich-editor";
import {
  CommunityButton,
  CommunityNotice,
  CommunityShell,
  confirmCommunity,
} from "@/components/community/ui";
import { CommentForm } from "@/components/community/comment-form";
import { MeditationContent } from "@/components/community/meditation-content";
import { DetailActionButton } from "@/components/ui/detail-action-button";

function PostContent(
  { churchId, post, run, busy }: {
    churchId: string;
    post: Post;
    run: (action: string, payload: Record<string, unknown>) => Promise<void>;
    busy: boolean;
  },
) {
  const router = useRouter();
  const dark = useAppSettings().theme === "dark";
  const downloads = useCommunityAttachments(
    churchId,
    post.attachments.filter((item) => item.kind === "image").map((item) =>
      item.id
    ),
  );
  const { showToast } = useToast();
  async function download(id: string) {
    try {
      const [file] = await resolveAttachments(churchId, [id]);
      if (!file) throw new Error("NOT_FOUND");
      await Linking.openURL(file.url);
    } catch (error) {
      showToast(communityError(error));
    }
  }
  return (
    <View className="mb-5 gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
        {post.post_type === "bible_reading" ? "함께 성경읽기" : "일반 글"}
      </Text>
      <Text className="text-2xl font-bold leading-8 text-gray-900 dark:text-white">
        {post.title}
      </Text>
      <Text className="text-sm text-gray-500">
        {post.author_name} · {new Date(post.created_at).toLocaleString("ko-KR")}
        {post.version > 1 ? " · 수정됨" : ""}
      </Text>
      {post.ranges.length
        ? (
          <View className="gap-1 rounded-xl bg-green-50 p-4 dark:bg-green-950">
            {post.ranges.map((range) => (
              <Text
                key={`${range.book_code}:${range.chapter_start}`}
                className="text-green-800 dark:text-green-200"
              >
                {rangeLabel(range)}
              </Text>
            ))}
          </View>
        )
        : null}
      <RichEditor
        key={post.version}
        initialContent={post.body}
        readOnly
        images={Object.fromEntries(
          Object.entries(downloads.urls).map(([id, url]) => [id, { url }]),
        )}
        dark={dark}
        dom={{ matchContents: true, scrollEnabled: false }}
        onLink={async (url) => {
          await Linking.openURL(url);
        }}
      />
      {downloads.isError
        ? (
          <CommunityButton
            secondary
            onPress={() => void downloads.refetch()}
          >
            이미지 다시 불러오기
          </CommunityButton>
        )
        : null}
      {post.attachments.filter((file) => file.kind === "file").map((file) => (
        <CommunityButton
          key={file.id}
          icon="download-outline"
          secondary
          onPress={() => void download(file.id)}
        >
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
        </CommunityButton>
      ))}
      <View className="flex-row flex-wrap gap-2">
        {post.tags.map((tag) => (
          <CommunityButton
            key={tag}
            secondary
            onPress={() =>
              router.push(
                {
                  pathname: "/churches/[id]/community",
                  params: { id: churchId, tag },
                } as never,
              )}
          >
            #{tag}
          </CommunityButton>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-2">
        <CommunityButton
          secondary={!post.liked}
          icon={post.liked ? "heart" : "heart-outline"}
          tone="favorite"
          disabled={busy}
          onPress={() => void run("like_post", { liked: !post.liked })}
        >
          좋아요 {post.like_count}
        </CommunityButton>
        {post.can_edit
          ? (
            <DetailActionButton
              action="edit"
              label="글 수정"
              disabled={busy}
              onPress={() =>
                router.push(
                  `/churches/${churchId}/community/${post.id}/edit` as never,
                )}
            />
          )
          : null}
        {post.can_delete
          ? (
            <DetailActionButton
              action="delete"
              label="글 삭제"
              variant="outline"
              disabled={busy}
              onPress={() =>
                void confirmCommunity("이 글과 댓글을 삭제할까요?").then(
                  (yes) => {
                    if (yes) {
                      void run("delete_post", {
                        expected_version: post.version,
                      });
                    }
                  },
                )}
            />
          )
          : null}
      </View>
      <Text className="text-base font-semibold text-gray-900 dark:text-white">
        댓글 {post.comment_count}
      </Text>
    </View>
  );
}
export default function CommunityPostScreen() {
  const { id, postId } = useLocalSearchParams<{ id: string; postId: string }>();
  const router = useRouter();
  const query = useCommunityPost(id, postId);
  const comments = useCommunityComments(id, postId, !!query.data);
  const refresh = useRefreshCommunity(id);
  const session = useCommunitySession();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  async function run(action: string, payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await communityRpc(id, action, { post_id: postId, ...payload });
      if (action === "delete_post") {
        await refresh();
        router.replace(`/churches/${id}/community` as never);
      } else await refresh();
    } catch (error) {
      showToast(communityError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <CommunityShell title="공동체 이야기" onBack={() => router.back()}>
      {!query.data
        ? (
          <CommunityNotice
            loading={query.isPending && !query.unavailable}
            message={query.unavailable
              ? "로그인 후 이용해 주세요."
              : query.isError
              ? communityError(query.error)
              : "글을 불러오는 중입니다."}
            onRetry={() => void query.refetch()}
          />
        )
        : (
          <FlatList
            data={comments.data?.pages.flatMap((page) => page.items) ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
            refreshing={query.isRefetching || comments.isRefetching}
            onRefresh={() => void refresh()}
            ListHeaderComponent={
              <PostContent
                churchId={id}
                post={query.data}
                run={run}
                busy={busy}
              />
            }
            renderItem={({ item }) => (
              <View className="mb-3 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.author_name} ·{" "}
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </Text>
                {item.meditation
                  ? <MeditationContent meditation={item.meditation} />
                  : (
                    <Text
                      selectable
                      className="text-base leading-7 text-gray-900 dark:text-white"
                    >
                      {item.content}
                    </Text>
                  )}
                <View className="flex-row flex-wrap gap-2">
                  <CommunityButton
                    secondary={!item.liked}
                    icon={item.liked ? "heart" : "heart-outline"}
                    tone="favorite"
                    disabled={busy}
                    onPress={() =>
                      void run("like_comment", {
                        comment_id: item.id,
                        liked: !item.liked,
                      })}
                  >
                    좋아요 {item.like_count}
                  </CommunityButton>
                  {item.can_edit
                    ? (
                      <DetailActionButton
                        action="edit"
                        label="댓글 수정"
                        disabled={busy}
                        onPress={() => setEditing(item)}
                      />
                    )
                    : null}
                  {item.can_delete
                    ? (
                      <DetailActionButton
                        action="delete"
                        label="댓글 삭제"
                        variant="outline"
                        disabled={busy}
                        onPress={() =>
                          void confirmCommunity("댓글을 삭제할까요?").then(
                            (yes) => {
                              if (yes) {
                                void run("delete_comment", {
                                  comment_id: item.id,
                                  expected_version: item.version,
                                });
                              }
                            },
                          )}
                      />
                    )
                    : null}
                </View>
                {item.can_edit && editing?.id === item.id
                  ? (
                    <CommentForm
                      key={`${session.actor}:${item.id}`}
                      churchId={id}
                      post={query.data!}
                      comment={editing}
                      onCancel={() => setEditing(null)}
                      onSaved={async () => {
                        setEditing(null);
                        await refresh();
                      }}
                    />
                  )
                  : null}
              </View>
            )}
            ListFooterComponent={
              <View className="gap-4">
                {comments.isError
                  ? (
                    <CommunityNotice
                      message={communityError(comments.error)}
                      onRetry={() => void comments.refetch()}
                    />
                  )
                  : null}
                {comments.hasNextPage
                  ? (
                    <CommunityButton
                      secondary
                      disabled={comments.isFetchingNextPage}
                      onPress={() => void comments.fetchNextPage()}
                    >
                      {comments.isFetchingNextPage
                        ? "불러오는 중…"
                        : "댓글 더 보기"}
                    </CommunityButton>
                  )
                  : null}
                <CommentForm
                  key={`${session.actor}:${composerKey}`}
                  churchId={id}
                  post={query.data}
                  onSaved={async () => {
                    setComposerKey((value) => value + 1);
                    await refresh();
                  }}
                />
              </View>
            }
          />
        )}
    </CommunityShell>
  );
}
