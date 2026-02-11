/** 복사용 구절 아이템 (bookName, chapter, verse, content) */
export type CopyVerseItem = {
  verse: number;
  content: string;
  bookName: string;
  chapter: number;
};

/**
 * 연속된 절 번호를 "1-3,5,7" 형태로 요약
 */
export function summarizeRanges(nums: number[]): string {
  if (!nums.length) return '';

  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(',');
}

/**
 * 선택된 구절 목록을 "본문\n책이름 1:1-3,5" 형식 문자열로 만듦
 */
export function makeCopyBibles(contentList: CopyVerseItem[]): string {
  if (!contentList?.length) return '';

  const sorted = [...contentList].sort((a, b) => a.verse - b.verse);
  const verses = sorted
    .map((item) =>
      item.content.startsWith('[')
        ? item.content.replace(/\[.*?\]/g, '').trim()
        : item.content
    )
    .join('\n\n');
  const bookName = sorted[0].bookName;
  const chapterVerse = `${sorted[0].chapter}:${summarizeRanges(sorted.map((c) => c.verse))}`;
  return `${verses}\n\n${bookName} ${chapterVerse}`;
}
