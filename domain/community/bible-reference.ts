import catalogue from "./bible-catalog.json";
import type { BibleVersion } from "./types";

const chapters = new Map(
  catalogue.chapters.map((chapter) => [
    `${chapter.version}:${chapter.book}:${chapter.chapter}`,
    chapter,
  ]),
);

export function getCommunityChapter(
  version: BibleVersion,
  book: string,
  chapter: number,
) {
  return chapters.get(`${version}:${book}:${chapter}`);
}

export function getCommunityVerseIds(
  version: BibleVersion,
  book: string,
  chapter: number,
): number[] {
  return [...(getCommunityChapter(version, book, chapter)?.verses ?? [])];
}
