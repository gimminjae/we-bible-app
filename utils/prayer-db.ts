import { createId } from '@/lib/date';
import { getActiveUserId } from '@/lib/auth-state';
import { createSupabaseClient } from '@/lib/supabase-client';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import type { SQLiteDatabase } from 'expo-sqlite';

const PRAYERS_TABLE = 'prayers';
const PRAYER_CONTENTS_TABLE = 'prayer_contents';

export type PrayContent = {
  id: number;
  content: string;
  registeredAt: string;
};

export type PrayRecord = {
  id: number;
  isMyPrayer: boolean;
  requester: string;
  relation: string;
  target: string;
  contents: PrayContent[];
};

export type PrayListItem = {
  id: number;
  isMyPrayer: boolean;
  requester: string;
  relation: string;
  target: string;
  latestContent: string;
  latestContentAt: string;
  createdAt: string;
  updatedAt: string;
};

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeRelation(relation: string): string {
  return relation.trim().slice(0, 50);
}

function normalizeRequester(requester: string, isMyPrayer: boolean): string {
  if (isMyPrayer) return '';
  return requester.trim();
}

function toSqliteBoolean(value: number | null | undefined): boolean {
  return value === 1;
}

function toSupabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('PRAYERS_REMOTE_ERROR');
}

async function ensureLocalPrayersTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${PRAYERS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT '',
      is_my_prayer INTEGER NOT NULL DEFAULT 0,
      requester TEXT DEFAULT '',
      relation TEXT DEFAULT '',
      target TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${PRAYER_CONTENTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT '',
      prayer_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      registered_at TEXT DEFAULT '',
      FOREIGN KEY (prayer_id) REFERENCES ${PRAYERS_TABLE}(id) ON DELETE CASCADE
    );
  `);
  const prayerInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${PRAYERS_TABLE})`);
  if (!prayerInfo.some((r) => r.name === 'client_id')) {
    await db.runAsync(`ALTER TABLE ${PRAYERS_TABLE} ADD COLUMN client_id TEXT DEFAULT ''`);
  }
  if (!prayerInfo.some((r) => r.name === 'is_my_prayer')) {
    await db.runAsync(
      `ALTER TABLE ${PRAYERS_TABLE} ADD COLUMN is_my_prayer INTEGER NOT NULL DEFAULT 0`,
    );
  }
  if (!prayerInfo.some((r) => r.name === 'relation')) {
    await db.runAsync(`ALTER TABLE ${PRAYERS_TABLE} ADD COLUMN relation TEXT DEFAULT ''`);
  }
  if (!prayerInfo.some((r) => r.name === 'updated_at')) {
    await db.runAsync(`ALTER TABLE ${PRAYERS_TABLE} ADD COLUMN updated_at TEXT DEFAULT ''`);
  }
  await db.runAsync(
    `UPDATE ${PRAYERS_TABLE} SET updated_at = created_at WHERE updated_at = '' OR updated_at IS NULL`,
  );
  const contentInfo = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${PRAYER_CONTENTS_TABLE})`,
  );
  if (!contentInfo.some((r) => r.name === 'client_id')) {
    await db.runAsync(`ALTER TABLE ${PRAYER_CONTENTS_TABLE} ADD COLUMN client_id TEXT DEFAULT ''`);
  }
}

type RemotePrayerRow = {
  id?: unknown;
  is_my_prayer?: unknown;
  requester?: unknown;
  relation?: unknown;
  target?: unknown;
  created_at?: unknown;
};

type RemotePrayerContentRow = {
  id?: unknown;
  prayer_id?: unknown;
  content?: unknown;
  registered_at?: unknown;
};

function normalizeRemotePrayerContent(row: RemotePrayerContentRow): PrayContent {
  return {
    id: Number(row.id ?? 0),
    content: String(row.content ?? ''),
    registeredAt: String(row.registered_at ?? ''),
  };
}

async function getRemotePrayerContents(
  prayerIds: number[],
): Promise<Map<number, PrayContent[]>> {
  const contentMap = new Map<number, PrayContent[]>();
  if (prayerIds.length === 0) return contentMap;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(PRAYER_CONTENTS_TABLE)
    .select('id, prayer_id, content, registered_at')
    .in('prayer_id', prayerIds)
    .order('registered_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw toSupabaseError(error);

  for (const row of data ?? []) {
    const prayerId = Number((row as RemotePrayerContentRow).prayer_id ?? 0);
    const existing = contentMap.get(prayerId) ?? [];
    existing.push(normalizeRemotePrayerContent(row as RemotePrayerContentRow));
    contentMap.set(prayerId, existing);
  }

  return contentMap;
}

export async function initPrayersTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalPrayersTable(db);
}

export async function addPrayer(
  db: SQLiteDatabase,
  requester: string,
  relation: string,
  target: string,
  initialContent: string,
  options?: { isMyPrayer?: boolean },
): Promise<number> {
  const createdAt = nowString();
  const prayerClientId = createId();
  const isMyPrayer = options?.isMyPrayer ?? false;
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(PRAYERS_TABLE)
      .insert({
        user_id: userId,
        client_id: prayerClientId,
        is_my_prayer: isMyPrayer,
        requester: normalizeRequester(requester, isMyPrayer),
        relation: normalizeRelation(relation),
        target: target.trim(),
        created_at: createdAt,
      })
      .select('id')
      .single();

    if (error) throw toSupabaseError(error);
    const prayerId = Number((data as { id?: unknown } | null)?.id ?? 0);
    if (prayerId && initialContent.trim()) {
      const { error: contentError } = await supabase.from(PRAYER_CONTENTS_TABLE).insert({
        client_id: createId(),
        prayer_id: prayerId,
        content: initialContent.trim(),
        registered_at: createdAt,
      });
      if (contentError) throw toSupabaseError(contentError);
    }
    return prayerId;
  }

  await ensureLocalPrayersTable(db);
  const result = await db.runAsync(
    `INSERT INTO ${PRAYERS_TABLE} (client_id, is_my_prayer, requester, relation, target, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    prayerClientId,
    isMyPrayer ? 1 : 0,
    normalizeRequester(requester, isMyPrayer),
    normalizeRelation(relation),
    target.trim(),
    createdAt,
    createdAt,
  );
  const prayerId = Number(result.lastInsertRowId);
  if (prayerId && initialContent.trim()) {
    await db.runAsync(
      `INSERT INTO ${PRAYER_CONTENTS_TABLE} (client_id, prayer_id, content, registered_at) VALUES (?, ?, ?, ?)`,
      createId(),
      prayerId,
      initialContent.trim(),
      createdAt,
    );
  }
  await queuePersistedSlicesSave(db, ['prayers']);
  return prayerId;
}

export async function getAllPrayers(db: SQLiteDatabase): Promise<PrayListItem[]> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(PRAYERS_TABLE)
      .select('id, is_my_prayer, requester, relation, target, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error) throw toSupabaseError(error);
    const prayerRows = (data ?? []) as RemotePrayerRow[];
    const prayerIds = prayerRows.map((row) => Number(row.id ?? 0)).filter((value) => value > 0);
    const contentMap = await getRemotePrayerContents(prayerIds);

    return prayerRows.map((row) => {
      const id = Number(row.id ?? 0);
      const contents = contentMap.get(id) ?? [];
      const latest = contents[0] ?? null;
      const createdAt = String(row.created_at ?? '');
      const isMyPrayer = Boolean(row.is_my_prayer);
      return {
        id,
        isMyPrayer,
        requester: normalizeRequester(String(row.requester ?? ''), isMyPrayer),
        relation: String(row.relation ?? ''),
        target: String(row.target ?? ''),
        latestContent: latest?.content ?? '',
        latestContentAt: latest?.registeredAt ?? '',
        createdAt,
        updatedAt: latest?.registeredAt ?? createdAt,
      };
    });
  }

  await ensureLocalPrayersTable(db);
  const prayers = await db.getAllAsync<{
    id: number;
    is_my_prayer: number | null;
    requester: string;
    relation: string;
    target: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, is_my_prayer, requester, relation, target, created_at, updated_at FROM ${PRAYERS_TABLE}`,
  );

  const items: PrayListItem[] = [];
  for (const p of prayers) {
    const latest = await db.getFirstAsync<{ content: string; registered_at: string }>(
      `SELECT content, registered_at FROM ${PRAYER_CONTENTS_TABLE} WHERE prayer_id = ? ORDER BY registered_at DESC, id DESC LIMIT 1`,
      p.id,
    );
    const createdAt = p.created_at ?? '';
    const isMyPrayer = toSqliteBoolean(p.is_my_prayer);
    const updatedAt = p.updated_at ?? latest?.registered_at ?? createdAt;
    items.push({
      id: p.id,
      isMyPrayer,
      requester: normalizeRequester(p.requester ?? '', isMyPrayer),
      relation: p.relation ?? '',
      target: p.target ?? '',
      latestContent: latest?.content ?? '',
      latestContentAt: latest?.registered_at ?? '',
      createdAt,
      updatedAt,
    });
  }
  return items.sort((left, right) => {
    const createdDiff = right.createdAt.localeCompare(left.createdAt);
    if (createdDiff !== 0) return createdDiff;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function getPrayerById(db: SQLiteDatabase, id: number): Promise<PrayRecord | null> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(PRAYERS_TABLE)
      .select('id, is_my_prayer, requester, relation, target, created_at')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    if (!data) return null;

    const contentsMap = await getRemotePrayerContents([id]);
    const contents = contentsMap.get(id) ?? [];
    const row = data as RemotePrayerRow;
    const isMyPrayer = Boolean(row.is_my_prayer);

    return {
      id,
      isMyPrayer,
      requester: normalizeRequester(String(row.requester ?? ''), isMyPrayer),
      relation: String(row.relation ?? ''),
      target: String(row.target ?? ''),
      contents,
    };
  }

  await ensureLocalPrayersTable(db);
  const row = await db.getFirstAsync<{
    id: number;
    is_my_prayer: number | null;
    requester: string;
    relation: string;
    target: string;
  }>(`SELECT id, is_my_prayer, requester, relation, target FROM ${PRAYERS_TABLE} WHERE id = ?`, id);
  if (!row) return null;

  const contentRows = await db.getAllAsync<{
    id: number;
    content: string;
    registered_at: string;
  }>(
    `SELECT id, content, registered_at FROM ${PRAYER_CONTENTS_TABLE} WHERE prayer_id = ? ORDER BY registered_at DESC, id DESC`,
    id,
  );

  return {
    id: row.id,
    isMyPrayer: toSqliteBoolean(row.is_my_prayer),
    requester: normalizeRequester(row.requester ?? '', toSqliteBoolean(row.is_my_prayer)),
    relation: row.relation ?? '',
    target: row.target ?? '',
    contents: contentRows.map((r) => ({
      id: r.id,
      content: r.content ?? '',
      registeredAt: r.registered_at ?? '',
    })),
  };
}

export async function updatePrayer(
  db: SQLiteDatabase,
  id: number,
  requester: string,
  relation: string,
  target: string,
  options?: { isMyPrayer?: boolean; skipPersist?: boolean },
): Promise<void> {
  const isMyPrayer = options?.isMyPrayer ?? false;
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(PRAYERS_TABLE)
      .update({
        is_my_prayer: isMyPrayer,
        requester: normalizeRequester(requester, isMyPrayer),
        relation: normalizeRelation(relation),
        target: target.trim(),
      })
      .eq('user_id', userId)
      .eq('id', id);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPrayersTable(db);
  await db.runAsync(
    `UPDATE ${PRAYERS_TABLE} SET is_my_prayer = ?, requester = ?, relation = ?, target = ?, updated_at = ? WHERE id = ?`,
    isMyPrayer ? 1 : 0,
    normalizeRequester(requester, isMyPrayer),
    normalizeRelation(relation),
    target.trim(),
    nowString(),
    id,
  );
  if (!options?.skipPersist) {
    await queuePersistedSlicesSave(db, ['prayers']);
  }
}

export async function deletePrayer(db: SQLiteDatabase, id: number): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(PRAYERS_TABLE).delete().eq('user_id', userId).eq('id', id);
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPrayersTable(db);
  await db.runAsync(`DELETE FROM ${PRAYERS_TABLE} WHERE id = ?`, id);
  await queuePersistedSlicesSave(db, ['prayers']);
}

export async function addPrayerContent(
  db: SQLiteDatabase,
  prayerId: number,
  content: string,
  options?: { skipPersist?: boolean },
): Promise<void> {
  const registeredAt = nowString();
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(PRAYER_CONTENTS_TABLE).insert({
      client_id: createId(),
      prayer_id: prayerId,
      content: content.trim(),
      registered_at: registeredAt,
    });
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPrayersTable(db);
  await db.runAsync(
    `INSERT INTO ${PRAYER_CONTENTS_TABLE} (client_id, prayer_id, content, registered_at) VALUES (?, ?, ?, ?)`,
    createId(),
    prayerId,
    content.trim(),
    registeredAt,
  );
  await db.runAsync(`UPDATE ${PRAYERS_TABLE} SET updated_at = ? WHERE id = ?`, registeredAt, prayerId);
  if (!options?.skipPersist) {
    await queuePersistedSlicesSave(db, ['prayers']);
  }
}

export async function updatePrayerContent(
  db: SQLiteDatabase,
  contentId: number,
  content: string,
  options?: { skipPersist?: boolean },
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(PRAYER_CONTENTS_TABLE)
      .update({
        content: content.trim(),
      })
      .eq('id', contentId);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPrayersTable(db);
  const updatedAt = nowString();
  const prayer = await db.getFirstAsync<{ prayer_id: number }>(
    `SELECT prayer_id FROM ${PRAYER_CONTENTS_TABLE} WHERE id = ?`,
    contentId,
  );
  await db.runAsync(
    `UPDATE ${PRAYER_CONTENTS_TABLE} SET content = ? WHERE id = ?`,
    content.trim(),
    contentId,
  );
  if (prayer?.prayer_id) {
    await db.runAsync(
      `UPDATE ${PRAYERS_TABLE} SET updated_at = ? WHERE id = ?`,
      updatedAt,
      prayer.prayer_id,
    );
  }
  if (!options?.skipPersist) {
    await queuePersistedSlicesSave(db, ['prayers']);
  }
}

export async function deletePrayerContent(
  db: SQLiteDatabase,
  contentId: number,
  options?: { skipPersist?: boolean },
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(PRAYER_CONTENTS_TABLE).delete().eq('id', contentId);
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPrayersTable(db);
  const updatedAt = nowString();
  const prayer = await db.getFirstAsync<{ prayer_id: number }>(
    `SELECT prayer_id FROM ${PRAYER_CONTENTS_TABLE} WHERE id = ?`,
    contentId,
  );
  await db.runAsync(`DELETE FROM ${PRAYER_CONTENTS_TABLE} WHERE id = ?`, contentId);
  if (prayer?.prayer_id) {
    await db.runAsync(
      `UPDATE ${PRAYERS_TABLE} SET updated_at = ? WHERE id = ?`,
      updatedAt,
      prayer.prayer_id,
    );
  }
  if (!options?.skipPersist) {
    await queuePersistedSlicesSave(db, ['prayers']);
  }
}

export async function persistPrayers(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await queuePersistedSlicesSave(db, ['prayers']);
}
