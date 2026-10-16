import { fileTypeFromBuffer } from "file-type";
const allowed: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  heic: ["image/heic", "image/heif"],
  heif: ["image/heif", "image/heic"],
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain"],
  doc: ["application/msword"],
  xls: ["application/vnd.ms-excel"],
  ppt: ["application/vnd.ms-powerpoint"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  hwp: ["application/x-hwp", "application/haansofthwp"],
  hwpx: ["application/hwp+zip", "application/zip"],
  zip: ["application/zip"],
  mp3: ["audio/mpeg"],
  m4a: ["audio/mp4", "audio/x-m4a"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime"],
};
export function validateMetadata(value: Record<string, unknown>) {
  const name = String(value.name ?? "").normalize("NFKC").replace(
    // deno-lint-ignore no-control-regex -- Remove control characters from download filenames.
    /[\x00-\x1f/\\]/g,
    "_",
  ).trim();
  const ext = name.split(".").at(-1)?.toLowerCase() ?? "";
  const size = Number(value.size), kind = value.kind;
  let mime = String(value.mime ?? "").toLowerCase();
  if (!mime || mime === "application/octet-stream") {
    mime = allowed[ext]?.[0] ?? "";
  }
  if (
    !name || name.length > 240 || !allowed[ext]?.includes(mime) ||
    !["image", "file"].includes(String(kind)) ||
    !Number.isSafeInteger(size) || size < 1 ||
    size > (kind === "image" ? 10485760 : 20971520) ||
    (kind === "image" && !mime.startsWith("image/")) ||
    !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(String(value.id)) ||
    !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(String(value.draft_id))
  ) throw new Error("INVALID_INPUT: file");
  return { ...value, name, mime, size, kind };
}
export async function validateBytes(
  bytes: Uint8Array,
  file: { name: string; mime: string; size: number },
) {
  if (bytes.byteLength !== file.size) throw new Error("INVALID_INPUT: size");
  const ext = file.name.split(".").at(-1)!.toLowerCase();
  if (ext === "txt" || ext === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (
      text.includes("\0") ||
      /<\s*(?:!doctype\s+html|html|script|svg)\b/i.test(text)
    ) throw new Error("INVALID_INPUT: unsafe text");
    return;
  }
  const detected = await fileTypeFromBuffer(bytes);
  const ole = bytes.slice(0, 8).every((v, i) =>
    v === [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1][i]
  );
  const compatible = detected && (
    allowed[ext]?.includes(detected.mime) ||
    (["doc", "xls", "ppt", "hwp"].includes(ext) && ole) ||
    (ext === "hwpx" && detected.mime === "application/zip") ||
    (ext === "m4a" && detected.ext === "m4a")
  );
  if (!compatible) throw new Error("INVALID_INPUT: file signature");
}
