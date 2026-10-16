import books from "./books.json";
import type { ReadingRange, RichNode } from "./types";

export const COMMUNITY_BOOKS = books;
export const COMMUNITY_BIBLE_VERSION = "ko-krv" as const;
export const VERSION_LABELS = {
  "ko-krv": "개역한글판",
  "en-kjv": "KJV",
  "de-luther1912": "Luther 1912",
} as const;
export function normalizeTags(tags: string[]): string[] {
  const result = [
    ...new Set(
      tags.map((tag) =>
        tag.normalize("NFKC").trim().replace(/^#+/, "").trim().toLowerCase()
      ).filter(Boolean),
    ),
  ];
  if (
    result.length > 5 ||
    result.some((tag) => [...tag].length > 20 || /[\s,#]/u.test(tag))
  ) {
    throw new Error(
      "태그는 공백 없이 20자 이내로, 최대 5개까지 입력해 주세요.",
    );
  }
  return result;
}
export function normalizeRanges(ranges: ReadingRange[]): ReadingRange[] {
  if (!ranges.length || ranges.length > 20) {
    throw new Error("읽을 범위를 1~20개 선택해 주세요.");
  }
  const result: ReadingRange[] = [];
  for (const book of books) {
    const values = ranges.filter((r) => r.book_code === book.bookCode).sort((
      a,
      b,
    ) => a.chapter_start - b.chapter_start);
    for (const value of values) {
      if (
        !Number.isInteger(value.chapter_start) ||
        !Number.isInteger(value.chapter_end) || value.chapter_start < 1 ||
        value.chapter_end < value.chapter_start ||
        value.chapter_end > book.maxChapter
      ) {
        throw new Error("성경의 장 범위를 확인해 주세요.");
      }
      const previous = result.at(-1);
      if (
        previous?.book_code === value.book_code &&
        value.chapter_start <= previous.chapter_end + 1
      ) {
        previous.chapter_end = Math.max(
          previous.chapter_end,
          value.chapter_end,
        );
      } else result.push({ ...value });
    }
  }
  if (ranges.some((r) => !books.some((b) => b.bookCode === r.book_code))) {
    throw new Error("성경을 다시 선택해 주세요.");
  }
  return result;
}
export function bodyText(node: RichNode): string {
  return node.text ??
    (node.content ?? []).map(bodyText).join(node.type === "doc" ? "\n" : "");
}
export function imageIds(node: RichNode): string[] {
  return [
    ...new Set([
      ...(node.type === "communityImage"
        ? [String(node.attrs?.attachmentId ?? "")]
        : []),
      ...(node.content ?? []).flatMap(imageIds),
    ]),
  ];
}
export function rangeLabel(range: ReadingRange) {
  const name = books.find((b) => b.bookCode === range.book_code)?.bookName.ko ??
    range.book_code;
  return `${name} ${range.chapter_start}${
    range.chapter_end === range.chapter_start ? "" : `–${range.chapter_end}`
  }장`;
}
export function communityError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const mapping: Record<string, string> = {
    PERMISSION_DENIED:
      "공동체 회원만 이용할 수 있습니다. 회원 상태를 확인해 주세요.",
    NOT_FOUND: "삭제되었거나 접근할 수 없는 글입니다.",
    VERSION_CONFLICT:
      "다른 곳에서 수정되었습니다. 새로고침한 뒤 다시 수정해 주세요.",
    READING_LOCKED: "묵상 댓글이 등록된 글은 읽을 범위를 변경할 수 없습니다.",
    INVALID_VERSE: "선택한 성경 구절이 읽을 범위에 없거나 유효하지 않습니다.",
    ATTACHMENT_NOT_READY: "파일 업로드를 완료한 뒤 저장해 주세요.",
    IDEMPOTENCY_CONFLICT:
      "이전 저장 요청과 내용이 다릅니다. 저장 결과를 확인해 주세요.",
    INVALID_INPUT: "입력 내용과 첨부 파일 제한을 확인해 주세요.",
  };
  return Object.entries(mapping).find(([key]) => message.includes(key))?.[1] ??
    (message || "처리하지 못했습니다. 다시 시도해 주세요.");
}
