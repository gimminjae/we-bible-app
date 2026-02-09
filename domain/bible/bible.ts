export interface BibleInfo {
  bookCode: string;
  chapter: number;
  lang: string;
}

export interface BibleVerse {
  verse?: number;
  content?: string;
  bookName?: string;
}
