import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { randomUUID } from "expo-crypto";
import type { Comment, Post, VerseReference } from "@/domain/community/types";
import {
  COMMUNITY_BIBLE_VERSION,
  communityError,
} from "@/domain/community/validation";
import { saveComment } from "@/lib/church-community";
import { CommunityButton, inputClass, Label } from "./ui";
import { VersePicker } from "./verse-picker";

export function CommentForm(
  { churchId, post, comment, onSaved, onCancel }: {
    churchId: string;
    post: Post;
    comment?: Comment;
    onSaved: () => Promise<void>;
    onCancel?: () => void;
  },
) {
  const [kind, setKind] = useState<"text" | "meditation">(
    comment?.comment_kind ?? "text",
  );
  const [content, setContent] = useState(
    comment?.content ?? comment?.meditation?.meditation_content ?? "",
  );
  const version = comment?.meditation?.bible_version ?? COMMUNITY_BIBLE_VERSION;
  const [verses, setVerses] = useState<VerseReference[]>(
    comment?.meditation?.verses ?? [],
  );
  const [readingVersion, setReadingVersion] = useState(post.reading_version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  async function submit() {
    if (saving.current) return;
    if (!content.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    if (kind === "meditation" && !verses.length) {
      setError("묵상한 구절을 선택해 주세요.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const input = kind === "text"
        ? { comment_kind: kind, content: content.trim() }
        : {
          comment_kind: kind,
          meditation: {
            bible_version: version,
            meditation_content: content.trim(),
            verses,
          },
        };
      const fingerprint = JSON.stringify(input);
      if (request.current?.fingerprint !== fingerprint) {
        request.current = { fingerprint, id: randomUUID() };
      }
      await saveComment(
        churchId,
        { ...post, reading_version: readingVersion },
        input,
        request.current.id,
        comment,
      );
      setContent("");
      setVerses([]);
      request.current = null;
      await onSaved();
    } catch (error) {
      setError(communityError(error));
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }
  return (
    <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Label>{comment ? "댓글 수정" : "댓글 남기기"}</Label>
      {post.post_type === "bible_reading" && !comment
        ? (
          <View className="flex-row gap-2">
            <CommunityButton
              icon="chatbubble-outline"
              secondary={kind !== "text"}
              disabled={busy}
              onPress={() => setKind("text")}
            >
              일반 댓글
            </CommunityButton>
            <CommunityButton
              icon="book-outline"
              tone="bible"
              secondary={kind !== "meditation"}
              disabled={busy}
              onPress={() => setKind("meditation")}
            >
              구절과 묵상
            </CommunityButton>
          </View>
        )
        : null}
      {kind === "meditation" && readingVersion !== post.reading_version
        ? (
          <>
            <Text className="text-red-600">
              읽을 범위가 변경되었습니다. 새 범위를 적용하고 구절을 다시 선택해
              주세요.
            </Text>
            <CommunityButton
              secondary
              onPress={() => {
                setReadingVersion(post.reading_version);
                setVerses([]);
              }}
            >
              새 읽기 범위 적용
            </CommunityButton>
          </>
        )
        : null}
      <View pointerEvents={busy ? "none" : "auto"}>
        {kind === "meditation"
          ? (
            <VersePicker
              churchId={churchId}
              ranges={post.ranges}
              version={version}
              value={verses}
              onChange={setVerses}
            />
          )
          : null}
      </View>
      <TextInput
        accessibilityLabel={kind === "meditation" ? "묵상 내용" : "댓글 내용"}
        editable={!busy}
        multiline
        scrollEnabled
        value={content}
        onChangeText={setContent}
        maxLength={kind === "meditation" ? 5000 : 2000}
        textAlignVertical="top"
        placeholder={kind === "meditation"
          ? "선택한 말씀을 묵상하며 느낀 내용을 나눠 주세요."
          : "댓글을 입력해 주세요."}
        className={`${inputClass} min-h-28`}
        style={{ maxHeight: 160 }}
      />
      {error
        ? (
          <Text accessibilityRole="alert" className="text-red-600">
            {error}
          </Text>
        )
        : null}
      <View className="flex-row gap-2">
        <CommunityButton icon="send-outline" disabled={busy} onPress={() => void submit()}>
          {busy ? "저장 중…" : comment ? "수정 완료" : "댓글 등록"}
        </CommunityButton>
        {onCancel
          ? (
            <CommunityButton secondary disabled={busy} onPress={onCancel}>
              취소
            </CommunityButton>
          )
          : null}
      </View>
    </View>
  );
}
