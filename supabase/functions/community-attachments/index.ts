import {
  adminClient,
  cors,
  finalizeFile,
  json,
  signedDownload,
  signUpload,
  storageRpc,
  type StoredAttachment,
  validateMetadata,
} from "../_shared/community-storage.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "PERMISSION_DENIED" }, 401);
    const { data, error } = await adminClient().auth.getUser(token);
    if (error || !data.user) return json({ error: "PERMISSION_DENIED" }, 401);
    const raw = await req.text();
    if (raw.length > 16000) return json({ error: "INVALID_INPUT" }, 413);
    const { action, churchId, ...payload } = JSON.parse(raw);
    if (!/^\d+$/.test(String(churchId))) throw new Error("INVALID_INPUT");
    const actor = data.user.id, church = String(churchId);
    if (action === "init") {
      const file = await storageRpc<StoredAttachment>(
        "reserve",
        actor,
        church,
        validateMetadata(payload),
      );
      if (file.state === "ready") {
        return json({
          attachment: {
            id: file.id,
            name: file.name,
            mime: file.mime,
            size: file.size,
            kind: file.kind,
          },
        });
      }
      return json(await signUpload(file));
    }
    if (action === "complete") {
      const file = await storageRpc<StoredAttachment>(
        "meta",
        actor,
        church,
        payload,
      );
      await finalizeFile(file);
      try {
        await storageRpc("finish", actor, church, { id: file.id });
      } catch (error) {
        // A cancelled/expired upload can race the copy. Keep deletion durable even after metadata disappeared.
        await storageRpc("queue", null, null, { key: file.object_key });
        throw error;
      }
      await storageRpc("queue", null, null, { key: file.staging_key });
      return json({
        id: file.id,
        name: file.name,
        mime: file.mime,
        size: file.size,
        kind: file.kind,
      });
    }
    if (action === "resolve") {
      if (!Array.isArray(payload.ids) || payload.ids.length > 10) {
        throw new Error("INVALID_INPUT");
      }
      const files = await storageRpc<StoredAttachment[]>(
        "resolve",
        actor,
        church,
        payload,
      );
      return json(await Promise.all(files.map(signedDownload)));
    }
    if (action === "cancel") {
      await storageRpc("cancel", actor, church, payload);
      return json({});
    }
    throw new Error("INVALID_INPUT");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe = [
      "PERMISSION_DENIED",
      "INVALID_INPUT",
      "NOT_FOUND",
      "ATTACHMENT_NOT_READY",
    ].find((code) => message.includes(code));
    console.error("community-attachments failed", safe ?? "STORAGE_ERROR");
    return json({
      error: safe ??
        "첨부 파일을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, safe === "PERMISSION_DENIED" ? 403 : 400);
  }
});
