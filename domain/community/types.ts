export type PostType = "general" | "bible_reading";
export type BibleVersion = "ko-krv" | "en-kjv" | "de-luther1912";
export type ReadingRange = {
  book_code: string;
  chapter_start: number;
  chapter_end: number;
};
export type VerseReference = {
  book_code: string;
  chapter: number;
  verse: number;
};
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "file";
};
export type Post = {
  id: string;
  church_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: RichNode;
  preview: string;
  post_type: PostType;
  tags: string[];
  ranges: ReadingRange[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  version: number;
  reading_version: number;
  reading_locked_at: string | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  can_edit: boolean;
  can_delete: boolean;
};
export type Meditation = {
  bible_version: BibleVersion;
  meditation_content: string;
  verses: VerseReference[];
};
export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  content: string | null;
  comment_kind: "text" | "meditation";
  meditation: Meditation | null;
  version: number;
  created_at: string;
  like_count: number;
  liked: boolean;
  can_edit: boolean;
  can_delete: boolean;
};
export type Cursor = { id: string; created_at: string };
export type Page<T> = { items: T[]; next: Cursor | null };
export type PostInput = {
  title: string;
  body: RichNode;
  post_type: PostType;
  tags: string[];
  ranges: ReadingRange[];
  attachment_ids: string[];
};
export const EMPTY_BODY: RichNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
