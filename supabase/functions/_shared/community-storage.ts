import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validateBytes } from "./community-files.ts";
export { validateMetadata } from "./community-files.ts";
import { createClient } from "@supabase/supabase-js";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
export function secret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`CONFIGURATION_MISSING: ${name}`);
  return value;
}
export const adminClient = () =>
  createClient(secret("SUPABASE_URL"), secret("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
export type StoredAttachment = {
  id: string;
  church_id: number;
  uploader_id: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "file";
  state: string;
  staging_key: string;
  object_key: string;
};
export async function storageRpc<T>(
  action: string,
  actor: string | null,
  church: string | null,
  payload: Record<string, unknown> = {},
) {
  const { data, error } = await adminClient().rpc("church_community_storage", {
    p_action: action,
    p_actor: actor,
    p_church_id: church,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data as T;
}
export function storage() {
  return {
    bucket: secret("COMMUNITY_S3_BUCKET"),
    client: new S3Client({
      region: secret("COMMUNITY_AWS_REGION"),
      credentials: {
        accessKeyId: secret("COMMUNITY_AWS_ACCESS_KEY_ID"),
        secretAccessKey: secret("COMMUNITY_AWS_SECRET_ACCESS_KEY"),
      },
    }),
  };
}
export function signUpload(file: StoredAttachment) {
  const { client, bucket } = storage();
  return createPresignedPost(client, {
    Bucket: bucket,
    Key: file.staging_key,
    Expires: 300,
    Fields: { "Content-Type": file.mime },
    Conditions: [["content-length-range", file.size, file.size], [
      "eq",
      "$Content-Type",
      file.mime,
    ]],
  });
}
export async function finalizeFile(file: StoredAttachment) {
  const { client, bucket } = storage();
  if (file.state === "ready") return;
  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: file.staging_key }),
  );
  if (
    head.ContentLength !== file.size || head.ContentType !== file.mime ||
    !head.ETag
  ) throw new Error("INVALID_INPUT: uploaded metadata");
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: file.staging_key,
      IfMatch: head.ETag,
    }),
  );
  if (!result.Body) throw new Error("INVALID_INPUT: empty file");
  await validateBytes(await result.Body.transformToByteArray(), file);
  // Clients can only write staging. Conditional copy prevents an overwrite between validation and promotion.
  try {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: file.object_key,
        CopySource: `${bucket}/${file.staging_key}`,
        CopySourceIfMatch: head.ETag,
        IfNoneMatch: "*",
        ContentType: file.mime,
        ContentDisposition: `attachment; filename*=UTF-8''${
          encodeURIComponent(file.name)
        }`,
        MetadataDirective: "REPLACE",
        CacheControl: "private, max-age=300",
      }),
    );
  } catch (error) {
    if (
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode !== 412
    ) throw error;
    // A concurrent completion may already have promoted this reservation. Never overwrite it.
    const existing = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: file.object_key }),
    );
    if (
      existing.ContentLength !== file.size || existing.ContentType !== file.mime
    ) throw error;
  }
}
export async function signedDownload(file: StoredAttachment) {
  const { client, bucket } = storage();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: file.object_key,
      ResponseContentDisposition: `${
        file.kind === "image" ? "inline" : "attachment"
      }; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    }),
    { expiresIn: 300 },
  );
  return { id: file.id, url, expiresAt: Date.now() + 300000 };
}
export async function deleteObject(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
