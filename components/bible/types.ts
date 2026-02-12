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

/** 관심 구절 식별자 — 오직 이 세 값으로만 식별함 */
export type FavoriteVerseId = {
  bookCode: string;
  chapter: number;
  verse: number;
};

/** 관심 구절 한 건. 식별은 FavoriteVerseId(성경코드, 장, 절)로만 하며, verseText·createdAt은 보기용 */
export type FavoriteVerseRecord = FavoriteVerseId & {
  verseText: string;
  /** 등록 시각 'YYYY-MM-DD HH:mm:ss' */
  createdAt: string;
};
