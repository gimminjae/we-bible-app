import { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { randomUUID } from "expo-crypto";
import * as Linking from "expo-linking";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/contexts/toast-context";
import {
  EMPTY_BODY,
  type Post,
  type PostType,
  type RichNode,
} from "@/domain/community/types";
import {
  bodyText,
  communityError,
  imageIds,
  normalizeRanges,
  normalizeTags,
} from "@/domain/community/validation";
import { communityRpc, savePost } from "@/lib/church-community";
import {
  communityKeys,
  useCommunityAttachments,
  useCommunitySession,
  useRefreshCommunity,
} from "@/hooks/use-community";
import { useCommunityUploads } from "@/hooks/use-community-uploads";
import RichEditor, { type CommunityEditorHandle } from "./rich-editor";
import { ReadingRanges } from "./reading-ranges";
import {
  Choice,
  CommunityButton,
  CommunityShell,
  confirmCommunity,
  inputClass,
  Label,
} from "./ui";

export function PostForm(
  { churchId, post: initialPost, onBack, onSaved }: {
    churchId: string;
    post?: Post;
    onBack: () => void;
    onSaved: (post: Post) => void;
  },
) {
  const [post] = useState(initialPost);
  const [title, setTitle] = useState(post?.title ?? "");
  const [postType, setPostType] = useState<PostType>(
    post?.post_type ?? "general",
  );
  const [ranges, setRanges] = useState(post?.ranges ?? []);
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [body, setBody] = useState<RichNode>(post?.body ?? EMPTY_BODY);
  const [keptFiles, setKeptFiles] = useState(
    post?.attachments.filter((item) => item.kind === "file") ?? [],
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState("");
  const editor = useRef<CommunityEditorHandle>(null);
  const saving = useRef(false);
  const lastRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const uploads = useCommunityUploads(churchId);
  const refresh = useRefreshCommunity(churchId);
  const session = useCommunitySession();
  const { showToast } = useToast();
  const dark = useColorScheme() === "dark";
  const ids = [
    ...new Set([
      ...(post?.attachments.map((item) => item.id) ?? []),
      ...uploads.jobs.filter((job) => job.status === "ready").map((job) =>
        job.id
      ),
    ]),
  ];
  const downloads = useCommunityAttachments(churchId, ids);
  const images: Record<string, { url?: string; status?: string }> = {};
  for (const [id, url] of Object.entries(downloads.urls)) images[id] = { url };
  for (const job of uploads.jobs) {
    images[job.id] = {
      url: downloads.urls[job.id],
      status: job.status === "failed"
        ? "업로드 실패 — 아래에서 다시 시도해 주세요."
        : `업로드 ${job.progress}%`,
    };
  }
  const suggested = useQuery({
    queryKey: [...communityKeys.scope(churchId, session.actor), "tags"],
    queryFn: () => communityRpc<string[]>(churchId, "suggest_tags"),
    enabled: session.enabled,
    retry: false,
  });
  const navigation = useNavigation();
  usePreventRemove(dirty || busy, ({ data }) => {
    if (saving.current) return;
    void confirmCommunity("작성 중인 내용을 버리고 나갈까요?").then((yes) => {
      if (yes) navigation.dispatch(data.action);
    });
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const changed = () => {
    setDirty(true);
    setError("");
  };
  async function commit(value: RichNode) {
    try {
      const imageReferences = imageIds(value);
      const files = [
        ...keptFiles.map((item) => item.id),
        ...uploads.jobs.filter((item) => item.kind === "file").map((item) =>
          item.id
        ),
      ];
      const attachments = [...new Set([...imageReferences, ...files])];
      if (!title.trim() || [...title.trim()].length > 100) {
        throw new Error("제목은 1~100자로 입력해 주세요.");
      }
      if (
        bodyText(value).length > 20000 || JSON.stringify(value).length > 262144
      ) throw new Error("본문은 20,000자 이내로 작성해 주세요.");
      if (!bodyText(value).trim() && !attachments.length) {
        throw new Error("본문이나 첨부 파일을 추가해 주세요.");
      }
      if (attachments.length > 10) {
        throw new Error("첨부 파일은 최대 10개까지 가능합니다.");
      }
      const available = new Set([
        ...(post?.attachments.map((item) => item.id) ?? []),
        ...uploads.jobs.filter((job) => job.status === "ready").map((job) =>
          job.id
        ),
      ]);
      if (attachments.some((id) => !available.has(id))) {
        throw new Error("본문에 포함된 파일의 업로드를 완료해 주세요.");
      }
      const input = {
        title: title.trim(),
        body: value,
        post_type: postType,
        tags: normalizeTags(tags.split(",")),
        ranges: postType === "bible_reading" ? normalizeRanges(ranges) : [],
        attachment_ids: attachments,
      };
      const fingerprint = JSON.stringify(input);
      if (lastRequest.current?.fingerprint !== fingerprint) {
        lastRequest.current = { fingerprint, id: randomUUID() };
      }
      const saved = await savePost(
        churchId,
        input,
        lastRequest.current.id,
        post,
      );
      setDirty(false);
      setBusy(false);
      saving.current = false;
      await refresh();
      showToast(post ? "글을 수정했습니다." : "글을 등록했습니다.");
      requestAnimationFrame(() => onSaved(saved));
    } catch (error) {
      setError(communityError(error));
      setBusy(false);
      saving.current = false;
    }
  }
  function requestSave() {
    if (
      saving.current || !editorReady ||
      typeof editor.current?.snapshot !== "function"
    ) return;
    saving.current = true;
    setBusy(true);
    setError("");
    editor.current.snapshot();
  }
  return (
    <CommunityShell
      title={post ? "글 수정" : "글 쓰기"}
      onBack={onBack}
      right={
        <CommunityButton
          disabled={busy || !session.enabled || !editorReady}
          onPress={requestSave}
        >
          {busy ? "저장 중" : "저장"}
        </CommunityButton>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 20 }}
      >
        {!session.enabled
          ? <Text className="text-red-600">로그인 상태를 확인해 주세요.</Text>
          : null}
        <View>
          <Label>글 유형</Label>
          <Choice
            label="글 유형"
            value={postType}
            disabled={!!post || busy}
            options={[{ value: "general", label: "일반 글" }, {
              value: "bible_reading",
              label: "함께 성경읽기",
            }]}
            onChange={(value) => {
              changed();
              setPostType(value as PostType);
              if (value === "bible_reading" && !ranges.length) {
                setRanges([{
                  book_code: "genesis",
                  chapter_start: 1,
                  chapter_end: 1,
                }]);
              }
            }}
          />
        </View>
        {postType === "bible_reading"
          ? (
            <View>
              <Label>함께 읽을 성경</Label>
              <ReadingRanges
                value={ranges}
                locked={!!post?.reading_locked_at || busy}
                onChange={(value) => {
                  changed();
                  setRanges(value);
                }}
              />
            </View>
          )
          : null}
        <View>
          <Label>제목</Label>
          <TextInput
            accessibilityLabel="글 제목"
            editable={!busy}
            value={title}
            onChangeText={(value) => {
              changed();
              setTitle(value);
            }}
            maxLength={100}
            placeholder="제목을 입력해 주세요"
            className={inputClass}
          />
        </View>
        <View>
          <Label>본문</Label>
          <Text className="mb-2 text-sm text-gray-500">
            글을 쓰다가 이미지 삽입을 누르면 현재 위치에 추가됩니다.
          </Text>
          <RichEditor
            ref={editor}
            onReady={async () => {
              setEditorReady(true);
            }}
            initialContent={post?.body ?? EMPTY_BODY}
            readOnly={busy}
            images={images}
            dark={dark}
            dom={{ matchContents: true, scrollEnabled: false }}
            onChange={async (value) => {
              changed();
              setBody(value);
            }}
            onSnapshot={commit}
            onLink={async (url) => {
              await Linking.openURL(url);
            }}
            onPickImage={async (id) => {
              try {
                changed();
                return await uploads.pick("image", id);
              } catch (error) {
                setError(communityError(error));
                return false;
              }
            }}
          />
          <Text className="mt-2 text-right text-xs text-gray-500">
            {bodyText(body).length.toLocaleString()} / 20,000자
          </Text>
        </View>
        <View className="gap-3">
          <Label>첨부 파일</Label>
          <CommunityButton
            secondary
            disabled={busy}
            onPress={() => {
              changed();
              void uploads.pick("file").catch((error) =>
                setError(communityError(error))
              );
            }}
          >
            파일 추가
          </CommunityButton>
          <Text className="text-xs text-gray-500">
            이미지 10MB · 파일 20MB · 최대 10개 / 합계 50MB
          </Text>
          {keptFiles.map((file) => (
            <View
              key={file.id}
              className="gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
            >
              <Text className="text-gray-900 dark:text-white">{file.name}</Text>
              <CommunityButton
                secondary
                disabled={busy}
                onPress={() => {
                  changed();
                  setKeptFiles((items) =>
                    items.filter((item) => item.id !== file.id)
                  );
                }}
              >
                첨부 제거
              </CommunityButton>
            </View>
          ))}
          {uploads.jobs.map((job) => (
            <View
              key={job.id}
              className="gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
            >
              <Text className="text-gray-900 dark:text-white">
                {job.file.name} · {job.status === "ready"
                  ? "완료"
                  : job.status === "failed"
                  ? "실패"
                  : `${job.progress}%`}
              </Text>
              {job.error
                ? (
                  <Text className="text-red-600">
                    {communityError(new Error(job.error))}
                  </Text>
                )
                : null}
              <View className="flex-row gap-2">
                {job.status === "failed"
                  ? (
                    <CommunityButton
                      secondary
                      disabled={busy}
                      onPress={() => uploads.retry(job.id)}
                    >
                      다시 시도
                    </CommunityButton>
                  )
                  : null}
                {job.kind === "file" || !imageIds(body).includes(job.id)
                  ? (
                    <CommunityButton
                      secondary
                      disabled={busy}
                      onPress={() => {
                        changed();
                        uploads.remove(job.id);
                      }}
                    >
                      삭제
                    </CommunityButton>
                  )
                  : (
                    <Text className="flex-1 text-xs text-gray-500">
                      본문에서 이미지를 삭제하면 저장할 때 제외됩니다.
                    </Text>
                  )}
              </View>
            </View>
          ))}
        </View>
        <View>
          <Label>태그</Label>
          <TextInput
            accessibilityLabel="태그"
            editable={!busy}
            value={tags}
            onChangeText={(value) => {
              changed();
              setTags(value);
            }}
            placeholder="예: 묵상, 요한복음, 은혜"
            className={inputClass}
          />
          <Text className="mt-2 text-xs text-gray-500">
            쉼표로 구분 · 최대 5개 · 각 20자
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {suggested.data?.filter((tag) =>
              !tags.split(",").map((t) => t.trim()).includes(tag)
            ).slice(0, 8).map((tag) => (
              <CommunityButton
                key={tag}
                secondary
                disabled={busy}
                onPress={() => {
                  changed();
                  setTags((value) => value ? `${value}, ${tag}` : tag);
                }}
              >
                #{tag}
              </CommunityButton>
            ))}
          </View>
        </View>
        {error
          ? (
            <Text accessibilityRole="alert" className="text-base text-red-600">
              {error}
            </Text>
          )
          : null}
        <CommunityButton
          disabled={busy || !session.enabled || !editorReady}
          onPress={requestSave}
        >
          {busy ? "저장 중…" : post ? "수정 완료" : "글 등록"}
        </CommunityButton>
      </ScrollView>
    </CommunityShell>
  );
}
