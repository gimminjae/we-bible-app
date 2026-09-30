// Run with PGLITE_MODULE pointing to @electric-sql/pglite's entry point (see supabase/tests/README.md).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(
  process.env.PGLITE_MODULE
    ? pathToFileURL(process.env.PGLITE_MODULE).href
    : '@electric-sql/pglite'
);
process.on('uncaughtException', (error) => {
  console.error(
    error.message,
    error.where ?? '',
    error.stack
      ?.split('\n')
      .filter((line) => line.includes('test-church'))
      .join('\n'),
  );
  process.exit(1);
});
const migration = await readFile(
  new URL(
    '../supabase/migrations/202609080001_add_church_member_metadata.sql',
    import.meta.url,
  ),
  'utf8',
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
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text)$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on all functions in schema auth to anon,authenticated;`);
  return db;
}
const db = await bootstrap();
// Keep this fixture reproducible after commits: use the pre-feature portion of the schema.
const baseline = (
  await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
).split('-- Community member metadata (202609080001)')[0];
await db.exec(baseline);
for (const name of (
  await readdir(new URL('../supabase/migrations/', import.meta.url))
)
  .filter((name) => name < '202609080001' && name.endsWith('.sql'))
  .sort()) {
  await db.exec(
    await readFile(
      new URL(`../supabase/migrations/${name}`, import.meta.url),
      'utf8',
    ),
  );
}
const ids = Array.from(
  { length: 6 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
);
const [admin, deputy, member, other, outsider, pending] = ids;
await db.query('insert into auth.users(id) select unnest($1::uuid[])', [ids]);
await db.query(
  "insert into public.user_profiles(user_id,display_name) select id,'Member ' || id::text from auth.users",
);
async function asUser(id, fn, role = 'authenticated') {
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)",
    [id ?? '', role],
  );
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const scalar = async (sql, args = []) =>
  (await db.query(sql, args)).rows[0].result;
const church = await asUser(admin, () =>
  scalar("select public.create_church('Metadata test') as result"),
);
await db.query(
  "insert into church_memberships(church_id,user_id,role) values ($1,$2,'deputy_admin'),($1,$3,'member'),($1,$4,'member')",
  [church, deputy, member, other],
);
await db.exec(migration);
const apiNames = [
  'get_church_member_metadata_fields',
  'create_church_member_metadata_field',
  'update_church_member_metadata_field',
  'get_church_member_metadata',
  'save_church_member_metadata',
  'search_church_members_by_metadata',
];
const apiCatalog = (
  await db.query(
    `select p.proname, n.nspname, p.prosecdef, p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_allowed,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as member_allowed
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where p.proname=any($1::text[]) and n.nspname in ('public','church_metadata_private')`,
    [apiNames],
  )
).rows;
check(apiCatalog.length, 12);
check(
  apiCatalog.every(
    (f) => f.prosecdef === (f.nspname === 'church_metadata_private'),
  ),
  true,
);
check(
  apiCatalog.every(
    (f) =>
      f.proconfig.includes('search_path=""') &&
      !f.anon_allowed &&
      f.member_allowed,
  ),
  true,
);
check(
  (
    await db.query(`select bool_and(relrowsecurity) as enabled from pg_class
  where oid in ('public.church_member_metadata_fields'::regclass,'public.church_member_metadata'::regclass)`)
  ).rows[0].enabled,
  true,
);
const fields = async (actor = admin, community = church) =>
  (
    await asUser(actor, () =>
      scalar('select public.get_church_member_metadata_fields($1) as result', [
        community,
      ]),
    )
  ).fields;
const get = (actor, target = member) =>
  asUser(actor, () =>
    scalar('select public.get_church_member_metadata($1,$2) as result', [
      church,
      target,
    ]),
  );
const update = (actor, field, changes = {}) => {
  const f = { ...field, ...changes };
  return asUser(actor, () =>
    scalar(
      'select public.update_church_member_metadata_field($1,$2,$3,$4,$5,$6,$7,$8) as result',
      [
        church,
        field.id,
        field.version,
        f.label,
        f.options === null ? null : JSON.stringify(f.options),
        f.is_active,
        f.is_copyable,
        f.edit_policy,
      ],
    ),
  );
};
const save = async (actor, target, patch, version, definitions) => {
  const defs = definitions ?? (await fields(actor));
  const versions = Object.fromEntries(defs.map((f) => [f.id, f.version]));
  return asUser(actor, () =>
    scalar(
      'select public.save_church_member_metadata($1,$2,$3,$4,$5) as result',
      [
        church,
        target,
        version,
        JSON.stringify(versions),
        JSON.stringify(patch),
      ],
    ),
  );
};
const search = (actor, field, value, offset = 0) =>
  asUser(actor, () =>
    scalar(
      'select public.search_church_members_by_metadata($1,$2,$3,30,$4) as result',
      [church, field.id, JSON.stringify(value), offset],
    ),
  );
const create = (
  actor,
  label,
  type = 'text',
  policy = 'self_and_admins',
  options = null,
) =>
  asUser(actor, () =>
    scalar(
      'select public.create_church_member_metadata_field($1,$2,$3,$4,false,$5) as result',
      [
        church,
        label,
        type,
        options === null ? null : JSON.stringify(options),
        policy,
      ],
    ),
  );
let defs = await fields();
check(defs.length, 5);
check(
  defs.filter((f) => f.is_copyable).map((f) => f.system_key),
  ['email', 'phone', 'address'],
);
await db.exec(migration);
check((await fields()).length, 5);
const second = await asUser(outsider, () =>
  scalar("select public.create_church('Another') as result"),
);
check((await fields(outsider, second)).length, 5);
const phone = defs.find((f) => f.system_key === 'phone');
let address = defs.find((f) => f.system_key === 'address');
const email = defs.find((f) => f.system_key === 'email');
let gender = defs.find((f) => f.system_key === 'gender');
const birth = defs.find((f) => f.system_key === 'birth_date');
check((await get(member)).version, 0);
let saved = await save(
  member,
  member,
  {
    [phone.id]: '010-1234-5678',
    [address.id]: '서울\n강남',
    [email.id]: 'person@example.com',
    [gender.id]: 'option_2',
  },
  0,
);
check(saved.version, 1);
check(saved.fields.find((f) => f.id === phone.id).value, '010-1234-5678');
await denied(
  () => save(member, member, { [birth.id]: '2025-02-30' }, 1),
  /METADATA_INVALID_DATE/,
);
await denied(
  () => save(member, member, { [phone.id]: 101234 }, 1),
  /METADATA_INVALID_VALUE/,
);
await denied(
  () => save(member, member, { [gender.id]: 'other' }, 1),
  /METADATA_INVALID_OPTIONS/,
);
await denied(
  () => save(member, member, { [email.id]: 'bad' }, 1),
  /METADATA_INVALID_EMAIL/,
);
check((await get(other)).fields.length, 0);
check((await search(other, address, '서울')).total, 0);
check((await search(member, address, '서울')).total, 1);
check((await search(admin, phone, '0101234')).total, 1);
check((await search(admin, email, 'EXAMPLE')).total, 1);
check((await search(admin, gender, 'option_2')).total, 1);
gender = await update(admin, gender, {
  label: '성별 선택',
  is_copyable: true,
  options: [
    { value: 'option_1', label: '남성' },
    { value: 'option_2', label: '여성' },
  ],
});
check(
  (await get(member)).fields.find((f) => f.id === gender.id).value,
  'option_2',
);
check((await search(admin, gender, 'option_2')).total, 1);
await db.exec(migration);
check(
  (await fields()).find((f) => f.id === gender.id),
  gender,
);
await denied(() =>
  asUser(admin, () =>
    db.query(
      "insert into church_member_metadata_fields(church_id,label,data_type) values($1,'direct','text')",
      [church],
    ),
  ),
);
await denied(
  () =>
    db.query(
      "update church_member_metadata_fields set data_type='text',options=null where id=$1",
      [gender.id],
    ),
  /METADATA_IMMUTABLE_FIELD/,
);
await denied(
  () => update(admin, gender, { is_copyable: null }),
  /METADATA_INVALID_SETTINGS/,
);
for (const actor of [outsider, pending]) {
  await denied(() => get(actor));
  await denied(() => search(actor, address, '서울'));
}
await denied(() =>
  asUser(
    null,
    () =>
      scalar('select public.get_church_member_metadata_fields($1) as result', [
        church,
      ]),
    'anon',
  ),
);
await denied(() =>
  asUser(member, () =>
    db.query('delete from church_member_metadata_fields where id=$1', [
      phone.id,
    ]),
  ),
);
await denied(() =>
  asUser(member, () =>
    db.query(
      'update church_member_metadata set "values"=$1 where church_id=$2',
      [{}, church],
    ),
  ),
);
check(
  (
    await asUser(other, () =>
      db.query(
        'select * from church_member_metadata where church_id=$1 and user_id=$2',
        [church, member],
      ),
    )
  ).rows.length,
  0,
);
await denied(() =>
  asUser(member, () =>
    scalar(
      'select church_metadata_private._seed_church_member_metadata_fields($1) as result',
      [church],
    ),
  ),
);
await denied(() => create(member, 'forbidden'));
await denied(() => create(deputy, 'forbidden policy', 'text', 'all_members'));
await denied(() => create(admin, '이메일'), /METADATA_DUPLICATE_LABEL/);
await denied(
  () =>
    create(admin, 'Bad options', 'binary', 'self_and_admins', [
      { value: 'option_1', label: 'yes' },
      { value: 'option_2', label: 'YES' },
    ]),
  /METADATA_INVALID_OPTIONS/,
);
for (const policy of [
  'super_admin_only',
  'admins_only',
  'self_and_admins',
  'all_members',
]) {
  address = await update(admin, address, { edit_policy: policy });
  for (const actor of [admin, deputy, member, other]) {
    for (const target of [member, actor]) {
      const permitted =
        actor === admin ||
        (actor === deputy && policy !== 'super_admin_only') ||
        (policy === 'self_and_admins' && actor === target) ||
        policy === 'all_members';
      const version = Number(
        (
          await db.query(
            'select coalesce((select version from church_member_metadata where church_id=$1 and user_id=$2),0) as v',
            [church, target],
          )
        ).rows[0].v,
      );
      if (permitted) {
        const result = await save(
          actor,
          target,
          { [address.id]: '서울' },
          version,
        );
        check(result.version, version + 1);
      } else
        await denied(() =>
          save(actor, target, { [address.id]: '서울' }, version),
        );
    }
  }
}
check(
  (await get(other)).fields.map((f) => f.id),
  [address.id],
);
check((await search(other, address, '서울')).total, 4);
await denied(() => update(deputy, address, { edit_policy: 'self_and_admins' }));
let snap = await get(other);
await denied(() =>
  save(
    other,
    member,
    { [address.id]: 'changed', [phone.id]: '010-5555-5555' },
    snap.version,
  ),
);
check((await get(other)).fields[0].value, '서울');
const response = await save(
  other,
  member,
  { [address.id]: '부산 100%_\\' },
  snap.version,
);
check(
  response.fields.map((f) => f.id),
  [address.id],
);
check((await search(other, address, '%_\\')).total, 1);
await denied(
  () => save(other, member, { [address.id]: 'stale' }, snap.version),
  /METADATA_CONFLICT/,
);
const oldDefs = await fields();
const currentVersion = (await get(member)).version;
address = await update(admin, address, { is_active: false });
await denied(
  () => save(other, member, { [address.id]: 'inactive' }, currentVersion),
  /METADATA_FIELD_INACTIVE/,
);
await save(member, member, { [phone.id]: null }, currentVersion);
check(
  (await get(admin)).fields.find((f) => f.id === address.id).value,
  '부산 100%_\\',
);
address = await update(admin, address, { is_active: true });
await denied(
  () =>
    save(
      other,
      member,
      { [address.id]: 'outdated definitions' },
      currentVersion + 1,
      oldDefs,
    ),
  /METADATA_CONFLICT/,
);
const number = await create(admin, '자녀 수', 'number', 'all_members');
let version = (await get(member)).version;
await save(member, member, { [number.id]: 0 }, version);
check((await search(other, number, 0)).total, 1);
version = (await get(member)).version;
await denied(
  () => save(member, member, { [number.id]: '0' }, version),
  /METADATA_INVALID_NUMBER/,
);
await denied(
  () => save(member, member, { [number.id]: 9007199254740992 }, version),
  /METADATA_INVALID_NUMBER/,
);
for (const raw of ['9007199254740990.5', '1e-1000']) {
  await denied(
    () =>
      asUser(member, () =>
        scalar(
          'select public.save_church_member_metadata($1,$2,$3,$4,$5) as result',
          [
            church,
            member,
            version,
            JSON.stringify({ [number.id]: number.version }),
            `{"${number.id}":${raw}}`,
          ],
        ),
      ),
    /METADATA_INVALID_NUMBER/,
  );
}
const foreign = (await fields(outsider, second))[0];
await denied(
  () => save(member, member, { [foreign.id]: 'bad' }, version),
  /METADATA_FIELD_NOT_FOUND/,
);
await denied(() => search(member, foreign, 'bad'), /METADATA_FIELD_NOT_FOUND/);
// The same actor can submit two snapshots; only the first may overwrite a version.
await save(member, member, { [number.id]: -1.5 }, version);
await denied(
  () => save(member, member, { [number.id]: 2 }, version),
  /METADATA_CONFLICT/,
);
// Metadata author deletion must not block deleting an ordinary account.
await create(deputy, 'Deputy field');
await asUser(deputy, () =>
  scalar('select public.delete_my_account() as result'),
);
check(
  (
    await db.query(
      'select count(*)::int as n from church_member_metadata_fields where label=$1 and created_by_user_id is null',
      ['Deputy field'],
    )
  ).rows[0].n,
  1,
);
// Representative search volume, stable pagination, and literal substring matching.
await db.query(
  "insert into auth.users(id) select md5('metadata-' || n)::uuid from generate_series(1,1000) n",
);
await db.query(
  "insert into church_memberships(church_id,user_id) select $1,md5('metadata-' || n)::uuid from generate_series(1,1000) n",
  [church],
);
await db.query(
  "insert into church_member_metadata(church_id,user_id,\"values\") select $1,md5('metadata-' || n)::uuid,jsonb_build_object($2::text,'서울') from generate_series(1,1000) n",
  [church, address.id],
);
const first = await search(admin, address, '서울');
const next = await search(admin, address, '서울', 30);
check(first.items.length, 30);
check(next.items.length, 30);
check(
  first.items.some((x) => next.items.some((y) => x.user_id === y.user_id)),
  false,
);
const explain = await db.query(
  'explain (analyze,format json) select user_id from church_member_metadata where church_id=$1 and strpos(lower("values"->>$2),lower($3))>0',
  [church, address.id, '서울'],
);
console.log(
  'Search plan:',
  explain.rows[0]['QUERY PLAN'][0].Plan['Node Type'],
  'execution ms:',
  explain.rows[0]['QUERY PLAN'][0]['Execution Time'],
);
await db.query(
  'delete from church_memberships where church_id=$1 and user_id=$2',
  [church, member],
);
check(
  (
    await db.query(
      'select count(*)::int as n from church_member_metadata where church_id=$1 and user_id=$2',
      [church, member],
    )
  ).rows[0].n,
  0,
);
await denied(() => get(member));
await db.query('delete from churches where id=$1', [church]);
check(
  (
    await db.query(
      'select count(*)::int as n from church_member_metadata_fields where church_id=$1',
      [church],
    )
  ).rows[0].n,
  0,
);
check((await fields(outsider, second)).length, 5);
await db.close();
// Verify the separately maintained fresh DB installation path, including function privileges.
const fresh = await bootstrap();
for (const name of [
  '01_tables',
  '02_indexes',
  '03_functions_helpers',
  '04_functions_sync',
  '05_functions_rpc',
  '06_triggers',
  '07_grants',
  '08_rls',
])
  await fresh.exec(
    await readFile(
      new URL(`../supabase/fresh-db/${name}.sql`, import.meta.url),
      'utf8',
    ),
  );
check(
  (
    await fresh.query(
      "select has_function_privilege('authenticated','public.save_church_member_metadata(bigint,uuid,integer,jsonb,jsonb)','EXECUTE') as allowed",
    )
  ).rows[0].allowed,
  true,
);
check(
  (
    await fresh.query(
      "select has_function_privilege('anon','public.save_church_member_metadata(bigint,uuid,integer,jsonb,jsonb)','EXECUTE') as allowed",
    )
  ).rows[0].allowed,
  false,
);
await fresh.close();
console.log(
  `Metadata database integration: ${assertions} assertions passed (real PostgreSQL in PGlite).`,
);
