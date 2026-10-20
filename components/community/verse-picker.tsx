import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type {
  BibleVersion,
  ReadingRange,
  VerseReference,
} from "@/domain/community/types";
import { COMMUNITY_BOOKS, VERSION_LABELS } from "@/domain/community/validation";
import { fetchCommunityVerses } from "@/lib/community-bible";
import { getCommunityVerseIds } from "@/domain/community/bible-reference";
import { communityKeys, useCommunitySession } from "@/hooks/use-community";
import { Choice, CommunityButton } from "./ui";
import { AppIcon } from "@/components/ui/feature";

export function VersePicker({
  churchId,
  ranges,
  version,
  value,
  onChange,
}: {
  churchId: string;
  ranges: ReadingRange[];
  version: BibleVersion;
  value: VerseReference[];
  onChange: (verses: VerseReference[]) => void;
}) {
  const choices = ranges.flatMap((range) =>
    Array.from(
      { length: range.chapter_end - range.chapter_start + 1 },
      (_, index) => ({
        book: range.book_code,
        chapter: range.chapter_start + index,
      }),
    )
  );
  const [selected, setSelected] = useState(
    `${choices[0]?.book}:${choices[0]?.chapter}`,
  );
  const current =
    choices.find((item) => `${item.book}:${item.chapter}` === selected) ??
      choices[0];
  const session = useCommunitySession();
  const ids = useQuery({
    queryKey: [
      ...communityKeys.scope(churchId, session.actor),
      "verses",
      version,
      current?.book,
      current?.chapter,
    ],
    queryFn: () =>
      getCommunityVerseIds(version, current.book, current.chapter),
    enabled: session.enabled && !!current,
    staleTime: Infinity,
    retry: false,
  });
  const text = useQuery({
    queryKey: [
      "community-bible-text",
      version,
      current?.book,
      current?.chapter,
    ],
    queryFn: ({ signal }) =>
      fetchCommunityVerses(version, current.book, current.chapter, signal),
    enabled: session.enabled && !!current,
    staleTime: 86400000,
    retry: false,
  });
  const rows = new Map(text.data?.map((item) => [item.verse, item.text]));
  function toggle(verse: number) {
    const reference = {
      book_code: current.book,
      chapter: current.chapter,
      verse,
    };
    const exists = value.some((item) =>
      item.book_code === reference.book_code &&
      item.chapter === reference.chapter && item.verse === verse
    );
    if (exists) {
      onChange(
        value.filter((item) =>
          !(item.book_code === reference.book_code &&
            item.chapter === reference.chapter && item.verse === verse)
        ),
      );
    } else if (value.length < 50) onChange([...value, reference]);
  }
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        성경 번역본 · {VERSION_LABELS[version]}
      </Text>
      <Choice
        label="묵상할 성경 장"
        value={`${current?.book}:${current?.chapter}`}
        options={choices.map((item) => ({
          value: `${item.book}:${item.chapter}`,
          label: `${
            COMMUNITY_BOOKS.find((book) => book.bookCode === item.book)
              ?.bookName.ko
          } ${item.chapter}장`,
        }))}
        onChange={setSelected}
      />
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        구절을 눌러 선택하세요. 여러 장에서 최대 50절 · {value.length}절 선택됨
      </Text>
      {value.length
        ? (
          <View className="flex-row flex-wrap gap-2">
            {value.map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="선택 구절 삭제"
                key={`${item.book_code}:${item.chapter}:${item.verse}`}
                onPress={() => onChange(value.filter((v) => v !== item))}
                className="rounded-full bg-green-100 px-3 py-2 dark:bg-green-950"
              >
                <Text className="text-sm text-green-800 dark:text-green-200">
                  {COMMUNITY_BOOKS.find((book) =>
                    book.bookCode === item.book_code
                  )?.bookName.ko} {item.chapter}:{item.verse} ×
                </Text>
              </Pressable>
            ))}
          </View>
        )
        : null}
      {ids.isError
        ? (
          <CommunityButton secondary onPress={() => void ids.refetch()}>
            구절 목록 다시 불러오기
          </CommunityButton>
        )
        : null}
      {text.isError
        ? (
          <>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              원문을 불러오지 못했습니다. 구절 번호로 선택할 수 있습니다.
            </Text>
            <CommunityButton secondary onPress={() => void text.refetch()}>
              원문 다시 불러오기
            </CommunityButton>
          </>
        )
        : null}
      {ids.isPending
        ? (
          <Text className="text-gray-600 dark:text-gray-400">
            구절을 불러오는 중입니다.
          </Text>
        )
        : null}
      {!ids.isPending && !ids.isError && ids.data?.length === 0
        ? (
          <Text className="text-red-600">
            성경 구절 목록이 아직 준비되지 않았습니다.
          </Text>
        )
        : null}
      {session.enabled && !ids.isError
        ? ids.data?.map((verse) => {
          const checked = value.some((item) =>
            item.book_code === current.book &&
            item.chapter === current.chapter && item.verse === verse
          );
          return (
            <Pressable
              key={verse}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => toggle(verse)}
              disabled={!checked && value.length >= 50}
              className={`flex-row items-start gap-3 rounded-2xl border p-4 ${
                checked
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <View className="pt-1"><AppIcon name={checked ? "checkmark-circle" : "ellipse-outline"} size={22} /></View>
              <Text className="flex-1 text-base leading-7 text-gray-900 dark:text-white">
                {verse} {rows.get(verse) ?? "절"}
              </Text>
            </Pressable>
          );
        })
        : null}
    </View>
  );
}
