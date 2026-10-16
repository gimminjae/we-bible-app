import { createSupabaseClient } from "@/lib/supabase-client";
import type {
  Attachment,
  BibleVersion,
  Comment,
  Cursor,
  Meditation,
  Page,
  Post,
  PostInput,
} from "@/domain/community/types";

export async function communityRpc<T>(
  churchId: string,
  action: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  let request = createSupabaseClient().rpc("church_community", {
    p_church_id: churchId,
    p_action: action,
    p_payload: payload,
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data as T;
}
export const listPosts = (
  church: string,
  tag: string,
  cursor: Cursor | null,
  signal?: AbortSignal,
) =>
  communityRpc<Page<Post>>(
    church,
    "list_posts",
    { tag: tag || null, cursor },
    signal,
  );
export const getPost = (church: string, post: string, signal?: AbortSignal) =>
  communityRpc<Post>(church, "get_post", { post_id: post }, signal);
export const listComments = (
  church: string,
  post: string,
  cursor: Cursor | null,
  signal?: AbortSignal,
) =>
  communityRpc<Page<Comment>>(church, "list_comments", {
    post_id: post,
    cursor,
  }, signal);
export const savePost = (
  church: string,
  input: PostInput,
  requestId: string,
  existing?: Post,
) =>
  communityRpc<Post>(church, "save_post", {
    ...input,
    request_id: requestId,
    post_id: existing?.id,
    expected_version: existing?.version,
  });
export const saveComment = (
  church: string,
  post: Post,
  input: {
    comment_kind: "text" | "meditation";
    content?: string;
    meditation?: Meditation;
  },
  requestId: string,
  existing?: Comment,
) =>
  communityRpc<Comment>(church, "save_comment", {
    ...input,
    post_id: post.id,
    request_id: requestId,
    expected_reading_version: post.reading_version,
    comment_id: existing?.id,
    expected_version: existing?.version,
  });
export const verseIds = (
  church: string,
  bible_version: BibleVersion,
  book_code: string,
  chapter: number,
  signal?: AbortSignal,
) =>
  communityRpc<number[]>(church, "verse_ids", {
    bible_version,
    book_code,
    chapter,
  }, signal);

export async function attachmentRequest<T>(
  churchId: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await createSupabaseClient().functions.invoke(
    "community-attachments",
    { body: { churchId, action, ...payload } },
  );
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (response?.error) message = response.error;
    }
    throw new Error(message);
  }
  return data as T;
}
export type Download = { id: string; url: string; expiresAt: number };
export const resolveAttachments = (church: string, ids: string[]) =>
  attachmentRequest<Download[]>(church, "resolve", { ids });
export type PickedFile = {
  uri: string;
  name: string;
  mime: string;
  size: number;
  file?: File;
};
export async function uploadAttachment(
  church: string,
  draftId: string,
  id: string,
  file: PickedFile,
  kind: Attachment["kind"],
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<Attachment> {
  const reservation = await attachmentRequest<
    { url: string; fields: Record<string, string>; attachment?: Attachment }
  >(church, "init", {
    id,
    draft_id: draftId,
    name: file.name,
    mime: file.mime,
    size: file.size,
    kind,
  });
  if (reservation.attachment) return reservation.attachment;
  if (signal.aborted) throw new Error("업로드가 취소되었습니다.");
  const data = new FormData();
  Object.entries(reservation.fields).forEach(([key, value]) =>
    data.append(key, value)
  );
  // React Native's FormData accepts URI-backed files; browsers supply the original File.
  data.append(
    "file",
    file.file ??
      ({ uri: file.uri, name: file.name, type: file.mime } as unknown as Blob),
  );
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("POST", reservation.url);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round(event.loaded / event.total * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("파일 전송에 실패했습니다. 다시 시도해 주세요."));
    xhr.onerror = () => reject(new Error("파일 전송 중 연결이 끊겼습니다."));
    xhr.ontimeout = () => reject(new Error("파일 전송 시간이 초과되었습니다."));
    xhr.onabort = () => reject(new Error("업로드가 취소되었습니다."));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    xhr.send(data);
  });
  if (signal.aborted) throw new Error("업로드가 취소되었습니다.");
  return attachmentRequest<Attachment>(church, "complete", { id });
}
