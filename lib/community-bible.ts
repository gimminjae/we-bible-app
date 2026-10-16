import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import catalogue from "@/domain/community/bible-catalog.json";
import { COMMUNITY_BOOKS } from "@/domain/community/validation";
import type { BibleVersion } from "@/domain/community/types";

const chapters = new Map(
  catalogue.chapters.map(
    (chapter) => [
      `${chapter.version}:${chapter.book}:${chapter.chapter}`,
      chapter,
    ],
  ),
);
export async function fetchCommunityVerses(
  version: BibleVersion,
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<{ verse: number; text: string }[]> {
  const reference = chapters.get(`${version}:${book}:${chapter}`);
  const info = COMMUNITY_BOOKS.find((value) => value.bookCode === book);
  if (!reference || !info) throw new Error("유효하지 않은 성경 범위입니다.");
  const url = version === "ko-krv"
    ? `https://webible.s3.ap-northeast-2.amazonaws.com/bible/${book}/${chapter}.json`
    : `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${
      version === "de-luther1912" ? info.bookCodeByLang.de : book
    }/chapters/${chapter}.json`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("성경 본문을 불러오지 못했습니다.");
  const raw = await response.text();
  if (
    await digestStringAsync(CryptoDigestAlgorithm.SHA256, raw) !==
      reference.sha256
  ) {
    throw new Error(
      "성경 원문이 변경되어 확인이 필요합니다. 구절 번호와 묵상은 계속 사용할 수 있습니다.",
    );
  }
  const json = JSON.parse(raw);
  const rows = (Array.isArray(json) ? json : json.data) as {
    verse: unknown;
    content?: string;
    text?: string;
  }[];
  const byId = new Map(
    rows.map((row) => [Number(row.verse), row.content ?? row.text ?? ""]),
  );
  return reference.verses.map((verse) => ({
    verse,
    text: byId.get(verse) ?? "",
  }));
}
