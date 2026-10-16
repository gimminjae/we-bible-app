import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type {
  BibleVersion,
  Meditation,
  VerseReference,
} from "@/domain/community/types";
import { COMMUNITY_BOOKS, VERSION_LABELS } from "@/domain/community/validation";
import { fetchCommunityVerses } from "@/lib/community-bible";

function VerseGroup(
  { version, verses }: { version: BibleVersion; verses: VerseReference[] },
) {
  const first = verses[0];
  const query = useQuery({
    queryKey: ["community-bible-text", version, first.book_code, first.chapter],
    queryFn: ({ signal }) =>
      fetchCommunityVerses(version, first.book_code, first.chapter, signal),
    staleTime: 86400000,
    retry: false,
  });
  return (
    <View className="gap-2 border-l-2 border-green-500 pl-3">
      <Text className="font-semibold text-green-800 dark:text-green-300">
        {COMMUNITY_BOOKS.find((book) => book.bookCode === first.book_code)
          ?.bookName.ko} {first.chapter}장 · {VERSION_LABELS[version]}
      </Text>
      {verses.map((verse) => (
        <Text
          key={verse.verse}
          className="text-sm leading-6 text-gray-700 dark:text-gray-300"
        >
          {verse.verse}절{" "}
          {query.data?.find((row) => row.verse === verse.verse)?.text ?? ""}
        </Text>
      ))}
      {query.isError
        ? (
          <Text className="text-xs text-gray-500">
            현재 성경 원문을 불러올 수 없습니다.
          </Text>
        )
        : null}
    </View>
  );
}
export function MeditationContent({ meditation }: { meditation: Meditation }) {
  const groups = new Map<string, VerseReference[]>();
  for (const verse of meditation.verses) {
    const key = `${verse.book_code}:${verse.chapter}`;
    groups.set(key, [...(groups.get(key) ?? []), verse]);
  }
  return (
    <View className="gap-4">
      {[...groups].map(([key, verses]) => (
        <VerseGroup
          key={key}
          version={meditation.bible_version}
          verses={verses}
        />
      ))}
      <Text
        selectable
        className="text-base leading-7 text-gray-900 dark:text-white"
      >
        {meditation.meditation_content}
      </Text>
    </View>
  );
}
