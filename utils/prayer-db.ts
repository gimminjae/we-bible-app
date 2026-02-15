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
  requester: string;
  target: string;
  contents: PrayContent[];
};

/** 목록용: 최근 기도 내용 1건 포함 */
export type PrayListItem = {
  id: number;
  requester: string;
  target: string;
  latestContent: string;
  latestContentAt: string;
};

/** 저장 시각 'YYYY-MM-DD HH:mm:ss' */
function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function initPrayersTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${PRAYERS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester TEXT DEFAULT '',
      target TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${PRAYER_CONTENTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      registered_at TEXT DEFAULT '',
      FOREIGN KEY (prayer_id) REFERENCES ${PRAYERS_TABLE}(id) ON DELETE CASCADE
    );
  `);
}

export async function addPrayer(
  db: SQLiteDatabase,
  requester: string,
  target: string,
  initialContent: string
): Promise<number> {
  const createdAt = nowString();
  const result = await db.runAsync(
    `INSERT INTO ${PRAYERS_TABLE} (requester, target, created_at) VALUES (?, ?, ?)`,
    requester.trim(),
    target.trim(),
    createdAt
  );
  const prayerId = Number(result.lastInsertRowId);
  if (prayerId && initialContent.trim()) {
    await db.runAsync(
      `INSERT INTO ${PRAYER_CONTENTS_TABLE} (prayer_id, content, registered_at) VALUES (?, ?, ?)`,
      prayerId,
      initialContent.trim(),
      createdAt
    );
  }
  return prayerId;
}

export async function getAllPrayers(db: SQLiteDatabase): Promise<PrayListItem[]> {
  const prayers = await db.getAllAsync<{
    id: number;
    requester: string;
    target: string;
  }>(
    `SELECT id, requester, target FROM ${PRAYERS_TABLE} ORDER BY id DESC`
  );

  const items: PrayListItem[] = [];
  for (const p of prayers) {
    const latest = await db.getFirstAsync<{ content: string; registered_at: string }>(
      `SELECT content, registered_at FROM ${PRAYER_CONTENTS_TABLE} WHERE prayer_id = ? ORDER BY registered_at DESC, id DESC LIMIT 1`,
      p.id
    );
    items.push({
      id: p.id,
      requester: p.requester ?? '',
      target: p.target ?? '',
      latestContent: latest?.content ?? '',
      latestContentAt: latest?.registered_at ?? '',
    });
  }
  return items;
}

export async function getPrayerById(db: SQLiteDatabase, id: number): Promise<PrayRecord | null> {
  const row = await db.getFirstAsync<{
    id: number;
    requester: string;
    target: string;
  }>(`SELECT id, requester, target FROM ${PRAYERS_TABLE} WHERE id = ?`, id);
  if (!row) return null;

  const contentRows = await db.getAllAsync<{
    id: number;
    content: string;
    registered_at: string;
  }>(
    `SELECT id, content, registered_at FROM ${PRAYER_CONTENTS_TABLE} WHERE prayer_id = ? ORDER BY registered_at DESC, id DESC`,
    id
  );

  return {
    id: row.id,
    requester: row.requester ?? '',
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
  target: string
): Promise<void> {
  await db.runAsync(
    `UPDATE ${PRAYERS_TABLE} SET requester = ?, target = ? WHERE id = ?`,
    requester.trim(),
    target.trim(),
    id
  );
}

export async function deletePrayer(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM ${PRAYERS_TABLE} WHERE id = ?`, id);
}

export async function addPrayerContent(
  db: SQLiteDatabase,
  prayerId: number,
  content: string
): Promise<void> {
  const registeredAt = nowString();
  await db.runAsync(
    `INSERT INTO ${PRAYER_CONTENTS_TABLE} (prayer_id, content, registered_at) VALUES (?, ?, ?)`,
    prayerId,
    content.trim(),
    registeredAt
  );
}

export async function updatePrayerContent(
  db: SQLiteDatabase,
  contentId: number,
  content: string
): Promise<void> {
  await db.runAsync(
    `UPDATE ${PRAYER_CONTENTS_TABLE} SET content = ? WHERE id = ?`,
    content.trim(),
    contentId
  );
}

export async function deletePrayerContent(db: SQLiteDatabase, contentId: number): Promise<void> {
  await db.runAsync(`DELETE FROM ${PRAYER_CONTENTS_TABLE} WHERE id = ?`, contentId);
}
