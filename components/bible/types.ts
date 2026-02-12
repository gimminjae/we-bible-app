export type BibleLang = 'ko' | 'en' | 'de';

/** 저장용 성경 검색/읽기 정보 (cookie → localStorage → sqlite 순으로 저장) */
export type BibleSearchInfo = {
  bookCode: string;
  chapter: number;
  primaryLang: BibleLang;
  fontScale: number;
  dualLang: boolean;
  secondaryLang: BibleLang;
};

export type DisplayVerse = {
  verse: number;
  primary: string;
  secondary?: string;
};

export type VersionOption = {
  val: string;
  txt: string;
  description: string;
};

/** 관심 구절 한 건 (DB 저장/리스트 페이지용) */
export type FavoriteVerseRecord = {
  bookCode: string;
  chapter: number;
  verse: number;
  verseText: string;
  /** 등록 시각 'YYYY-MM-DD HH:mm:ss' */
  createdAt: string;
};
