// Run with PGLITE_MODULE pointing to @electric-sql/pglite's entry point (see supabase/tests/README.md).
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { renderBibleValidators } from "./generate-community-bible-sql.mjs";
const { PGlite } = await import(
  process.env.PGLITE_MODULE
    ? pathToFileURL(process.env.PGLITE_MODULE).href
    : "@electric-sql/pglite"
);
process.on("uncaughtException", (error) => {
  console.error(
    error.message,
    error.where ?? "",
    error.stack
      ?.split("\n")
      .filter((line) => line.includes("test-church"))
      .join("\n"),
  );
  process.exit(1);
});
const migration = await readFile(
  new URL(
    "../supabase/migrations/202609080001_add_church_member_metadata.sql",
    import.meta.url,
  ),
  "utf8",
);
let assertions = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  assertions++;
};
const denied = async (fn, pattern = /PERMISSION_DENIED|permission denied/) => {
  await assert.rejects(fn, pattern);
  assertions++;
};
async function bootstrap() {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text)$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on all functions in schema auth to anon,authenticated;`,
  );
  return db;
}
const db = await bootstrap();
// Keep this fixture reproducible after commits: use the pre-feature portion of the schema.
const baseline = (
  await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")
).split("-- Community member metadata (202609080001)")[0];
await db.exec(baseline);
for (
  const name of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((name) => name < "202609080001" && name.endsWith(".sql"))
    .sort()
) {
  await db.exec(
    await readFile(
      new URL(`../supabase/migrations/${name}`, import.meta.url),
      "utf8",
    ),
  );
}
const ids = Array.from(
  { length: 6 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [admin, deputy, member, other, outsider, pending] = ids;
await db.query("insert into auth.users(id) select unnest($1::uuid[])", [ids]);
await db.query(
  "insert into public.user_profiles(user_id,display_name) select id,'Member ' || id::text from auth.users",
);
async function asUser(id, fn, role = "authenticated") {
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)",
    [id ?? "", role],
  );
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
const scalar = async (sql, args = []) =>
  (await db.query(sql, args)).rows[0].result;
const church = await asUser(
  admin,
  () => scalar("select public.create_church('Metadata test') as result"),
);
await db.query(
  "insert into church_memberships(church_id,user_id,role) values ($1,$2,'deputy_admin'),($1,$3,'member'),($1,$4,'member')",
  [church, deputy, member, other],
);
await db.exec(migration);

await db.exec(
  await readFile(
    process.env.COMMUNITY_BASELINE_MIGRATION ?? new URL(
      "../supabase/migrations/20261016041414_add_church_community.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const rpc = (actor, action, payload = {}, scope = church) =>
  asUser(
    actor,
    () =>
      scalar("select church_community($1,$2,$3) as result", [
        scope,
        action,
        JSON.stringify(payload),
      ]),
  );
const request = () => crypto.randomUUID();
const body = {
  type: "doc",
  content: [{
    type: "paragraph",
    content: [{ type: "text", text: "함께 읽어요" }],
  }],
};
const input = () => ({
  request_id: request(),
  title: "성경 읽기",
  body,
  post_type: "general",
  tags: ["#은혜", "은혜", "  Bible  "],
  ranges: [],
  attachment_ids: [],
});
await denied(() => rpc(outsider, "list_posts"));
await denied(() => rpc(pending, "list_posts"));
await denied(() =>
  asUser(
    null,
    () =>
      scalar("select church_community($1,'list_posts','{}') as result", [
        church,
      ]),
    "anon",
  )
);
await denied(() =>
  asUser(member, () => db.query("select * from church_posts"))
);
await denied(() =>
  asUser(
    member,
    () => db.query("select church_community_private.validate_body('{}')"),
  )
);
const createInput = input();
const first = await rpc(member, "save_post", createInput);
check(typeof first.id, "string");
check(first.tags, ["bible", "은혜"]);
check(first.can_edit, true);
check((await rpc(member, "save_post", createInput)).id, first.id);
await denied(
  () => rpc(member, "save_post", { ...createInput, title: "changed" }),
  /IDEMPOTENCY_CONFLICT/,
);
await denied(
  () =>
    rpc(other, "save_post", {
      ...input(),
      post_id: first.id,
      expected_version: 1,
    }),
  /PERMISSION_DENIED/,
);
await denied(
  () =>
    rpc(admin, "save_post", {
      ...input(),
      post_id: first.id,
      expected_version: 1,
    }),
  /PERMISSION_DENIED/,
);
await denied(
  () =>
    rpc(member, "save_post", {
      ...input(),
      post_id: first.id,
      expected_version: 4,
    }),
  /VERSION_CONFLICT/,
);
check(
  (await rpc(member, "like_post", { post_id: first.id, liked: true }))
    .like_count,
  1,
);
check(
  (await rpc(member, "like_post", { post_id: first.id, liked: true }))
    .like_count,
  1,
);
check(
  (await rpc(other, "like_post", { post_id: first.id, liked: true }))
    .like_count,
  2,
);
check(
  (await rpc(member, "like_post", { post_id: first.id, liked: false }))
    .like_count,
  1,
);
const normal = await rpc(other, "save_comment", {
  request_id: request(),
  post_id: first.id,
  comment_kind: "text",
  content: "아멘",
});
check(
  (await rpc(other, "like_comment", {
    post_id: first.id,
    comment_id: normal.id,
    liked: true,
  })).like_count,
  1,
);
check((await rpc(member, "get_post", { post_id: first.id })).comment_count, 1);
await denied(() =>
  rpc(member, "delete_comment", {
    post_id: first.id,
    comment_id: normal.id,
    expected_version: 1,
  })
);
const badBodies = [{ type: "doc", content: [{ type: "script" }] }, {
  type: "doc",
  content: [{
    type: "paragraph",
    content: [{
      type: "text",
      text: "x",
      marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    }],
  }],
}, {
  type: "doc",
  content: [{
    type: "communityImage",
    attrs: { attachmentId: request(), src: "https://example.com" },
  }],
}];
for (const value of badBodies) {
  await denied(
    () => rpc(member, "save_post", { ...input(), body: value }),
    /INVALID_INPUT/,
  );
}
check(
  (await rpc(member, "verse_ids", {
    bible_version: "ko-krv",
    book_code: "john",
    chapter: 3,
  })).includes(16),
  true,
);
const reading = await rpc(member, "save_post", {
  ...input(),
  post_type: "bible_reading",
  ranges: [{ book_code: "john", chapter_start: 3, chapter_end: 3 }, {
    book_code: "john",
    chapter_start: 4,
    chapter_end: 4,
  }],
});
check(reading.ranges, [{
  book_code: "john",
  chapter_start: 3,
  chapter_end: 4,
}]);
const medInput = {
  request_id: request(),
  post_id: reading.id,
  comment_kind: "meditation",
  expected_reading_version: 1,
  meditation: {
    bible_version: "ko-krv",
    meditation_content: "하나님의 사랑",
    verses: [{ book_code: "john", chapter: 3, verse: 16 }, {
      book_code: "john",
      chapter: 4,
      verse: 1,
    }],
  },
};
const med = await rpc(other, "save_comment", medInput);
check(med.meditation.verses.length, 2);
check(med.content, null);
check((await rpc(other, "save_comment", medInput)).id, med.id);
// Upgrade a populated database, including installations of the original seed SQL.
const legacyComments = [];
for (const version of ["en-kjv", "de-luther1912"]) {
  const legacyInput = {
    ...medInput,
    request_id: request(),
    meditation: { ...medInput.meditation, bible_version: version },
  };
  legacyComments.push({
    legacyInput,
    legacy: await rpc(other, "save_comment", legacyInput),
  });
}
const savedReading = await rpc(member, "get_post", { post_id: reading.id });
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261020040857_use_static_community_bible_catalog.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
check(await rpc(member, "get_post", { post_id: reading.id }), savedReading);
check(await rpc(other, "save_comment", medInput), med);
check(
  (await db.query(`select
  to_regclass('church_community_private.bible_reference_books') as books,
  to_regclass('church_community_private.bible_reference_verses') as verses`))
    .rows[0],
  {
    books: null,
    verses: null,
  },
);
const catalogue = JSON.parse(
  await readFile(
    new URL(
      "../domain/community/bible-catalog.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
check(
  (await db.query(
    `select count(*)::integer as mismatches
  from jsonb_to_recordset($1::jsonb) as r(version text,book text,chapter integer,verses jsonb)
  where to_jsonb(church_community_private.bible_verse_ids(version,book,chapter)) is distinct from verses`,
    [JSON.stringify(catalogue.chapters)],
  )).rows[0].mismatches,
  0,
);
for (
  const [version, book, chapter, verse] of [
    ["unknown", "john", 3, 16],
    ["ko-krv", "fake", 3, 16],
    ["ko-krv", "john", 0, 16],
    ["ko-krv", "john", -1, 16],
    ["ko-krv", "john", 22, 1],
    ["ko-krv", "john", 3, 0],
    ["ko-krv", "john", 3, 37],
    ["ko-krv", "john", null, 16],
    ["ko-krv", "john", 3, null],
  ]
) {
  check(
    await scalar(
      "select church_community_private.bible_valid_verse($1,$2,$3,$4) as result",
      [version, book, chapter, verse],
    ),
    false,
  );
}
for (
  const range of [
    { book_code: "fake", chapter_start: 1, chapter_end: 1 },
    { book_code: "john", chapter_start: 0, chapter_end: 1 },
    { book_code: "john", chapter_start: 1, chapter_end: 22 },
  ]
) {
  await denied(() =>
    rpc(member, "save_post", {
      ...input(),
      post_type: "bible_reading",
      ranges: [range],
    }), /INVALID_INPUT/);
}
await denied(() =>
  db.query(
    "update church_post_reading_ranges set chapter_end=22 where post_id=$1",
    [reading.id],
  ), /church_reading_range_reference/);
await denied(() =>
  db.query(
    "update church_comment_meditation_verses set verse=999 where comment_id=$1",
    [med.id],
  ), /church_meditation_verse_reference_check/);
await denied(() =>
  asUser(member, () =>
    db.query(
      "select church_community_private.bible_verse_ids('ko-krv','john',3)",
    ))
);
// Existing non-Korean editions remain readable/editable after the upgrade.
for (const { legacyInput, legacy } of legacyComments) {
  check(await rpc(other, "save_comment", legacyInput), legacy);
  const edited = await rpc(other, "save_comment", {
    ...legacyInput,
    request_id: request(),
    comment_id: legacy.id,
    expected_version: 1,
    meditation: {
      ...legacyInput.meditation,
      meditation_content: "Updated meditation",
    },
  });
  check(edited.meditation.bible_version, legacyInput.meditation.bible_version);
  check(edited.meditation.verses, legacy.meditation.verses);
  await rpc(other, "delete_comment", {
    post_id: reading.id,
    comment_id: legacy.id,
    expected_version: 2,
  });
}
// A future catalogue with skipped verse numbers must not invent missing IDs.
await db.exec("begin");
try {
  await db.exec(renderBibleValidators(
    [{ bookCode: "sample", bookSeq: 1, maxChapter: 1 }],
    {
      chapters: ["ko-krv", "en-kjv", "de-luther1912"].map((version) => ({
        version,
        book: "sample",
        chapter: 1,
        verses: [1, 3],
      })),
    },
  ));
  check(
    await scalar(
      "select church_community_private.bible_verse_ids('ko-krv','sample',1) as result",
    ),
    [1, 3],
  );
  check(
    await scalar(
      "select church_community_private.bible_valid_verse('ko-krv','sample',1,2) as result",
    ),
    false,
  );
} finally {
  await db.exec("rollback");
}
await denied(
  () =>
    rpc(other, "save_comment", {
      ...medInput,
      request_id: request(),
      expected_reading_version: 2,
    }),
  /VERSION_CONFLICT/,
);
await denied(
  () =>
    rpc(other, "save_comment", {
      ...medInput,
      request_id: request(),
      meditation: {
        ...medInput.meditation,
        verses: [{ book_code: "john", chapter: 3, verse: 999 }],
      },
    }),
  /INVALID_VERSE/,
);
await denied(
  () =>
    rpc(member, "save_post", {
      ...input(),
      post_id: reading.id,
      post_type: "bible_reading",
      expected_version: 1,
      ranges: [{ book_code: "john", chapter_start: 3, chapter_end: 3 }],
    }),
  /READING_LOCKED/,
);
await rpc(other, "delete_comment", {
  post_id: reading.id,
  comment_id: med.id,
  expected_version: 1,
});
check(
  Boolean(
    (await rpc(member, "get_post", { post_id: reading.id })).reading_locked_at,
  ),
  true,
);
await denied(
  () =>
    rpc(member, "save_post", {
      ...input(),
      post_id: reading.id,
      post_type: "bible_reading",
      expected_version: 1,
      ranges: [{ book_code: "john", chapter_start: 3, chapter_end: 3 }],
    }),
  /READING_LOCKED/,
);
const page = await rpc(member, "list_posts", { limit: 1 });
check(page.items.length, 1);
check(Boolean(page.next), true);
const page2 = await rpc(member, "list_posts", { limit: 1, cursor: page.next });
check(page2.items[0].id, first.id);
check(page2.next, null);
check(
  (await rpc(member, "list_comments", { post_id: first.id })).items[0].id,
  normal.id,
);
await rpc(deputy, "delete_comment", {
  post_id: first.id,
  comment_id: normal.id,
  expected_version: 1,
});
await rpc(deputy, "delete_post", { post_id: first.id, expected_version: 1 });
await denied(() => rpc(member, "get_post", { post_id: first.id }), /NOT_FOUND/);
await db.query(
  "delete from church_memberships where church_id=$1 and user_id=$2",
  [church, other],
);
await denied(() => rpc(other, "get_post", { post_id: reading.id }));
check(
  (await db.query("select count(*)::int n from church_comment_likes")).rows[0]
    .n,
  0,
);
// Service-only file lifecycle and tenant boundaries.
const storage = (action, actor = member, payload = {}, scope = church) =>
  asUser(
    null,
    () =>
      scalar("select church_community_storage($1,$2,$3,$4) as result", [
        action,
        actor,
        scope,
        JSON.stringify(payload),
      ]),
    "service_role",
  );
await denied(() =>
  asUser(member, () => db.query("select church_community_storage('cleanup')"))
);
await denied(() =>
  asUser(
    member,
    () =>
      db.query(
        "select church_community_private.storage_api('cleanup',null,null,'{}')",
      ),
  )
);
const fileInput = {
  id: request(),
  draft_id: request(),
  name: "photo.png",
  mime: "image/png",
  size: 100,
  kind: "image",
};
const reserved = await storage("reserve", member, fileInput);
check(reserved.state, "pending");
check(
  (await storage("reserve", member, fileInput)).object_key,
  reserved.object_key,
);
await denied(() =>
  storage("reserve", outsider, { ...fileInput, id: request() })
);
check((await storage("resolve", member, { ids: [reserved.id] })).length, 0);
await storage("finish", member, { id: reserved.id });
check((await storage("reserve", member, fileInput)).state, "ready");
check((await storage("resolve", member, { ids: [reserved.id] })).length, 1);
check((await storage("resolve", admin, { ids: [reserved.id] })).length, 0);
const imageBody = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "앞" }] }, {
    type: "communityImage",
    attrs: { attachmentId: reserved.id, alt: "사진" },
  }, { type: "paragraph", content: [{ type: "text", text: "뒤" }] }],
};
await denied(
  () => rpc(member, "save_post", { ...input(), body: imageBody }),
  /INVALID_INPUT/,
);
const photo = await rpc(member, "save_post", {
  ...input(),
  body: imageBody,
  attachment_ids: [reserved.id],
});
check(photo.attachments.length, 1);
check((await storage("resolve", admin, { ids: [reserved.id] })).length, 1);
await denied(() => storage("cancel", member, { id: reserved.id }));
await denied(
  () =>
    rpc(admin, "save_post", {
      ...input(),
      body: imageBody,
      attachment_ids: [reserved.id],
    }),
  /ATTACHMENT_NOT_READY/,
);
const secondChurch = await asUser(
  outsider,
  () => scalar("select create_church('Other community') as result"),
);
check(
  (await storage("resolve", outsider, { ids: [reserved.id] }, secondChurch))
    .length,
  0,
);
await denied(
  () => rpc(outsider, "get_post", { post_id: photo.id }, secondChurch),
  /NOT_FOUND/,
);
await rpc(member, "delete_post", { post_id: photo.id, expected_version: 1 });
const jobs = await storage("cleanup", null, {}, null);
check(jobs.some((job) => job.object_key === reserved.object_key), true);
check(jobs.some((job) => job.object_key === reserved.staging_key), true);
const reservedAgain = await storage("reserve", member, fileInput);
check(reservedAgain.object_key !== reserved.object_key, true); // stale cleanup can never delete a new upload
await storage("cancel", member, { id: reservedAgain.id });
const quotaDraft = request();
for (let i = 0; i < 10; i++) {
  await storage("reserve", member, {
    ...fileInput,
    id: request(),
    draft_id: quotaDraft,
  });
}
await denied(
  () =>
    storage("reserve", member, {
      ...fileInput,
      id: request(),
      draft_id: quotaDraft,
    }),
  /INVALID_INPUT/,
);
await db.exec(
  "update church_post_attachments set created_at=now()-interval '25 hours' where state='pending'",
);
await storage("cleanup", null, {}, null);
check(
  (await db.query(
    "select count(*)::int n from church_post_attachments where state='pending'",
  )).rows[0].n,
  0,
);
await denied(() => rpc(member, "save_post", createInput), /NOT_FOUND/); // no resurrection through a request replay
await denied(
  () =>
    rpc(member, "save_post", {
      ...input(),
      body: { type: "doc", content: [{}] },
    }),
  /INVALID_INPUT/,
);
await denied(
  () =>
    rpc(member, "save_comment", {
      ...medInput,
      request_id: request(),
      meditation: { ...medInput.meditation, verses: [] },
    }),
  /INVALID_VERSE/,
);
const flags = (await db.query(
  "select bool_and(relrowsecurity) enabled from pg_class where relname in ('church_posts','church_comments','church_post_attachments','church_comment_meditations')",
)).rows[0];
check(flags.enabled, true);
await denied(
  () =>
    db.exec(
      `begin; insert into church_comments(church_id,post_id,author_id,comment_kind) values (${church},${reading.id},'${member}','meditation'); commit;`,
    ),
  /INVALID_INPUT/,
);
const rich = await rpc(member, "save_post", {
  ...input(),
  body: {
    type: "doc",
    content: [{
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "제목" }],
    }, {
      type: "orderedList",
      attrs: { start: 1, type: null },
      content: [{
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [{
            type: "text",
            text: "목록",
            marks: [{ type: "bold" }, {
              type: "link",
              attrs: {
                href: "https://example.org",
                target: "_blank",
                rel: "noopener noreferrer",
                class: null,
              },
            }],
          }],
        }],
      }],
    }],
  },
});
check(rich.body.content[1].attrs.start, 1);
await denied(
  () => rpc(member, "save_post", { ...input(), tags: [{ bad: "tag" }] }),
  /INVALID_INPUT/,
);
await rpc(member, "delete_post", { post_id: rich.id, expected_version: 1 });
const oldJob = (await storage("cleanup", null, {}, null))[0];
await storage("queue", null, { key: oldJob.object_key }, null);
await storage("cleanup_done", null, {
  key: oldJob.object_key,
  generation: oldJob.generation,
}, null);
check(
  (await storage("cleanup", null, {}, null)).some((job) =>
    job.object_key === oldJob.object_key &&
    job.generation === oldJob.generation + 1
  ),
  true,
);
await storage("cleanup_done", null, {
  key: oldJob.object_key,
  generation: oldJob.generation + 1,
}, null);
check(
  (await storage("cleanup", null, {}, null)).some((job) =>
    job.object_key === oldJob.object_key
  ),
  false,
);
console.log(`Community DB: ${assertions} assertions passed`);
await db.close();
