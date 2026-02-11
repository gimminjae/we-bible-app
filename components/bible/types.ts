export type BibleLang = 'ko' | 'en' | 'de';

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
