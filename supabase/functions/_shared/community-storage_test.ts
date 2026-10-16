import { validateBytes, validateMetadata } from "./community-files.ts";
function assert(value: unknown, message = "assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(fn: () => unknown | Promise<unknown>) {
  let failed = false;
  try {
    await fn();
  } catch {
    failed = true;
  }
  assert(failed, "expected rejection");
}
const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1kAAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
const base = {
  id: "00000000-0000-4000-8000-000000000001",
  draft_id: "00000000-0000-4000-8000-000000000002",
  name: "photo.png",
  mime: "image/png",
  size: png.length,
  kind: "image",
};
Deno.test("file metadata rejects unsupported types, size spoofing and path segments", async () => {
  assert(
    validateMetadata({ ...base, name: "../../photo.png" }).name ===
      ".._.._photo.png",
  );
  await rejects(() =>
    validateMetadata({ ...base, name: "photo.svg", mime: "image/svg+xml" })
  );
  await rejects(() => validateMetadata({ ...base, size: 0 }));
  await rejects(() => validateMetadata({ ...base, size: 10485761 }));
  await rejects(() =>
    validateMetadata({ ...base, name: "page.html", mime: "text/html" })
  );
  await rejects(() =>
    validateMetadata({
      ...base,
      name: "payload.exe",
      mime: "application/octet-stream",
    })
  );
});
Deno.test("uploaded bytes must match declared size and real file signature", async () => {
  await validateBytes(png, base);
  await rejects(() =>
    validateBytes(new TextEncoder().encode("<svg/>"), { ...base, size: 6 })
  );
  await rejects(() => validateBytes(png, { ...base, size: png.length + 1 }));
  await rejects(() =>
    validateBytes(png, {
      ...base,
      name: "document.pdf",
      mime: "application/pdf",
    })
  );
});
Deno.test("text attachments accept Korean UTF-8 and reject active markup and binary data", async () => {
  const text = new TextEncoder().encode("말씀을 나누어요.\n아멘");
  await validateBytes(text, {
    name: "묵상.txt",
    mime: "text/plain",
    size: text.length,
  });
  for (
    const content of [
      "<script>alert(1)</script>",
      '<svg onload="alert(1)"/>',
      "hello\0world",
    ]
  ) {
    const bytes = new TextEncoder().encode(content);
    await rejects(() =>
      validateBytes(bytes, {
        name: "notes.txt",
        mime: "text/plain",
        size: bytes.length,
      })
    );
  }
});
