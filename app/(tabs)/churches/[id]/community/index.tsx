import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCommunityPosts } from "@/hooks/use-community";
import { communityError, rangeLabel } from "@/domain/community/validation";
import { AppIcon, FeatureIcon } from "@/components/ui/feature";
import {
  CommunityButton,
  CommunityNotice,
  CommunityShell,
  inputClass,
} from "@/components/community/ui";

export default function CommunityScreen() {
  const { id, tag = "" } = useLocalSearchParams<{ id: string; tag?: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState(tag);
  const query = useCommunityPosts(id, tag);
  return (
    <CommunityShell
      title="공동체 이야기"
      onBack={() => router.back()}
      right={
        <CommunityButton
          icon="create-outline"
          disabled={query.unavailable || query.isError}
          onPress={() => router.push(`/churches/${id}/community/add` as never)}
        >
          글 쓰기
        </CommunityButton>
      }
    >
      <View className="gap-2 px-4 pb-3">
        <View className="flex-row gap-2">
          <TextInput
            accessibilityLabel="태그로 글 찾기"
            value={filter}
            onChangeText={setFilter}
            onSubmitEditing={() =>
              router.setParams({
                tag: filter.normalize("NFKC").trim().replace(/^#+/, "")
                  .toLowerCase(),
              })}
            placeholder="태그로 찾기"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <CommunityButton
            secondary
            icon="search-outline"
            onPress={() =>
              router.setParams({
                tag: filter.normalize("NFKC").trim().replace(/^#+/, "")
                  .toLowerCase(),
              })}
          >
            찾기
          </CommunityButton>
        </View>
        {tag
          ? (
            <CommunityButton
              secondary
              onPress={() => {
                setFilter("");
                router.setParams({ tag: "" });
              }}
            >
              #{tag} · 필터 해제
            </CommunityButton>
          )
          : null}
      </View>
      {query.isError || query.unavailable
        ? (
          <CommunityNotice
            message={query.unavailable
              ? "로그인 후 공동체 게시판을 이용해 주세요."
              : communityError(query.error)}
            onRetry={() => void query.refetch()}
          />
        )
        : (
          <FlatList
            data={query.data?.pages.flatMap((page) => page.items) ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                void query
                  .fetchNextPage();
              }
            }}
            onEndReachedThreshold={.4}
            ListEmptyComponent={
              <CommunityNotice
                loading={query.isPending}
                message={query.isPending
                  ? "글을 불러오는 중입니다."
                  : tag
                  ? "이 태그의 글이 없습니다."
                  : "공동체의 첫 이야기를 나눠 주세요."}
              />
            }
            ListFooterComponent={query.isFetchingNextPage
              ? (
                <Text className="p-4 text-center text-gray-500">
                  불러오는 중…
                </Text>
              )
              : null}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(`/churches/${id}/community/${item.id}` as never)}
                className="gap-3 rounded-3xl border border-blue-100 bg-white p-5 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
              >
                <View className="flex-row items-center gap-3">
                  <FeatureIcon name={item.post_type === "bible_reading" ? "book-outline" : "chatbubble-ellipses-outline"} tone={item.post_type === "bible_reading" ? "bible" : "community"} size={38} />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.author_name}</Text>
                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(item.created_at).toLocaleDateString("ko-KR")}</Text>
                  </View>
                  <AppIcon name="chevron-forward" tone="community" size={16} />
                </View>
                {item.post_type === "bible_reading"
                  ? (
                    <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                      함께 성경읽기 · {item.ranges.map(rangeLabel).join(", ")}
                    </Text>
                  )
                  : null}
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {item.title}
                </Text>
                {item.preview
                  ? (
                    <Text
                      numberOfLines={3}
                      className="text-base leading-6 text-gray-600 dark:text-gray-300"
                    >
                      {item.preview}
                    </Text>
                  )
                  : null}
                <View className="flex-row flex-wrap gap-2">
                  {item.tags.map((value) => (
                    <Pressable
                      accessibilityRole="button"
                      key={value}
                      onPress={() => {
                        setFilter(value);
                        router.setParams({ tag: value });
                      }}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 dark:bg-blue-950"
                    >
                      <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">
                        #{value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row flex-wrap items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <View className="flex-row items-center gap-1.5">
                    <AppIcon name={item.liked ? "heart" : "heart-outline"} tone="favorite" size={17} />
                    <Text className="text-sm text-gray-500 dark:text-gray-400">좋아요 {item.like_count}</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <AppIcon name="chatbubble-outline" tone="community" size={16} />
                    <Text className="text-sm text-gray-500 dark:text-gray-400">댓글 {item.comment_count}</Text>
                  </View>
                  {item.attachments.length ? <View className="flex-row items-center gap-1.5"><AppIcon name="attach-outline" tone="memo" size={18} /><Text className="text-sm text-gray-500 dark:text-gray-400">{item.attachments.length}</Text></View> : null}
                </View>
              </Pressable>
            )}
          />
        )}
    </CommunityShell>
  );
}
