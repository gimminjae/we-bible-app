// Reads the same public-domain editions as services/bible.ts. No credentials.
// Cache allows interrupted runs to resume; only identifiers and SHA256 are committed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const books = JSON.parse(
  await readFile(new URL("../domain/community/books.json", import.meta.url)),
);
const cache = process.env.COMMUNITY_BIBLE_CACHE ??
  "/private/tmp/we-bible-community-bible";
await mkdir(cache, { recursive: true });
const jobs = ["ko-krv", "en-kjv", "de-luther1912"].flatMap((version) =>
  books.flatMap((book) =>
    Array.from(
      { length: book.maxChapter },
      (_, i) => ({ version, book, chapter: i + 1 }),
    )
  )
);
const results = new Array(jobs.length);
let index = 0, done = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (index < jobs.length) {
    const i = index++, { version, book, chapter } = jobs[i];
    const url = version === "ko-krv"
      ? `https://webible.s3.ap-northeast-2.amazonaws.com/bible/${book.bookCode}/${chapter}.json`
      : `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${
        version === "de-luther1912" ? book.bookCodeByLang.de : book.bookCode
      }/chapters/${chapter}.json`;
    const file = path.join(
      cache,
      `${version}-${book.bookCode}-${chapter}.json`,
    );
    let raw;
    try {
      raw = await readFile(file, "utf8");
    } catch {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error(`${response.status} ${url}`);
          raw = await response.text();
          JSON.parse(raw);
          await writeFile(file, raw);
          break;
        } catch (error) {
          if (attempt === 3) throw error;
        }
      }
    }
    const json = JSON.parse(raw);
    const rows = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(rows) || !rows.length) {
      throw new Error(`No verses: ${url}`);
    }
    const verses = [...new Set(rows.map((row) => Number(row.verse)))];
    if (verses.some((v) => !Number.isSafeInteger(v) || v < 1)) {
      throw new Error(`Invalid verse IDs: ${url}`);
    }
    // Some upstream chapters repeat the same rows. Only identical duplicates are safe.
    for (const verse of verses) {
      const texts = new Set(
        rows.filter((row) => Number(row.verse) === verse).map((row) =>
          row.content ?? row.text
        ),
      );
      if (texts.size !== 1) {
        throw new Error(`Conflicting verse ${verse}: ${url}`);
      }
    }
    results[i] = {
      version,
      book: book.bookCode,
      chapter,
      verses: verses.sort((a, b) => a - b),
      sha256: createHash("sha256").update(raw).digest("hex"),
    };
    if (++done % 200 === 0) {
      console.log(`${done}/${jobs.length} chapters verified`);
    }
  }
}));
const data = {
  generated_at: new Date().toISOString(),
  sources: [
    "https://webible.s3.ap-northeast-2.amazonaws.com/bible/",
    "https://github.com/wldeh/bible-api",
  ],
  chapters: results,
};
await writeFile(
  new URL("../domain/community/bible-catalog.json", import.meta.url),
  JSON.stringify(data) + "\n",
);
console.log(
  `${done} chapters complete. Review static catalogue changes before generating SQL validators.`,
);
