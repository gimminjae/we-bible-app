import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const books = await readFile(
  new URL("../domain/community/books.json", import.meta.url),
  "utf8",
);
const source = (await readFile(
  new URL("../domain/community/validation.ts", import.meta.url),
  "utf8",
)).replace(/import books from [^;]+;/, `const books=${books};`);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { normalizeTags, normalizeRanges, imageIds, bodyText } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
test("tags normalize Unicode, case, leading # and duplicates", () => {
  assert.deepEqual(normalizeTags(["#은혜", " 은혜 ", "ＢＩＢＬＥ", "Bible"]), [
    "은혜",
    "bible",
  ]);
  assert.throws(() => normalizeTags(["two words"]));
  assert.throws(() => normalizeTags(["가".repeat(21)]));
  assert.throws(() => normalizeTags(["1", "2", "3", "4", "5", "6"]));
});
test("reading ranges merge overlap and adjacency in canonical book order", () => {
  assert.deepEqual(
    normalizeRanges([
      { book_code: "john", chapter_start: 3, chapter_end: 3 },
      { book_code: "genesis", chapter_start: 1, chapter_end: 2 },
      { book_code: "john", chapter_start: 4, chapter_end: 6 },
      { book_code: "john", chapter_start: 5, chapter_end: 8 },
    ]),
    [{ book_code: "genesis", chapter_start: 1, chapter_end: 2 }, {
      book_code: "john",
      chapter_start: 3,
      chapter_end: 8,
    }],
  );
  assert.deepEqual(
    normalizeRanges([{ book_code: "john", chapter_start: 1, chapter_end: 1 }, {
      book_code: "john",
      chapter_start: 3,
      chapter_end: 3,
    }]).length,
    2,
  );
});
test("reading ranges reject unknown books, chapter zero and overflow", () => {
  for (
    const r of [
      { book_code: "fake", chapter_start: 1, chapter_end: 1 },
      { book_code: "john", chapter_start: 0, chapter_end: 2 },
      { book_code: "john", chapter_start: 1, chapter_end: 22 },
      { book_code: "john", chapter_start: 2, chapter_end: 1 },
      { book_code: "john", chapter_start: 1.5, chapter_end: 2 },
    ]
  ) assert.throws(() => normalizeRanges([r]));
});
test("image manifests deduplicate repeated references without touching body order", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "앞" }] },
      { type: "communityImage", attrs: { attachmentId: "one" } },
      { type: "paragraph", content: [{ type: "text", text: "뒤" }] },
      { type: "communityImage", attrs: { attachmentId: "one" } },
    ],
  };
  assert.deepEqual(imageIds(doc), ["one"]);
  assert.match(bodyText(doc), /앞\n\n뒤/);
  assert.equal(doc.content[1].attrs.attachmentId, "one");
});
test("Bible catalogue has 66 books and complete chapter IDs for each edition", async () => {
  const catalogue = JSON.parse(
    await readFile(
      new URL("../domain/community/bible-catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const parsed = JSON.parse(books);
  assert.equal(parsed.length, 66);
  assert.equal(catalogue.chapters.length, 3567);
  for (const version of ["ko-krv", "en-kjv", "de-luther1912"]) {
    for (const book of parsed) {
      const chapters = catalogue.chapters.filter((row) =>
        row.version === version && row.book === book.bookCode
      );
      assert.equal(chapters.length, book.maxChapter);
      for (const chapter of chapters) {
        assert.equal(chapter.sha256.length, 64);
        assert.ok(
          chapter.verses.every((v) => Number.isSafeInteger(v) && v > 0),
        );
        assert.equal(new Set(chapter.verses).size, chapter.verses.length);
      }
    }
  }
});
