import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { type SQLiteBindValue, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

type ExportPayload = {
  exportedAt: string;
  source: 'sqlite';
  tables: Record<string, unknown[]>;
};

function toSQLiteBindValue(value: unknown): SQLiteBindValue {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return JSON.stringify(value);
}

function buildFileName(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `we-bible-db-export-${ts}.json`;
}

function escapeTableName(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function escapeColumnName(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function triggerWebDownload(fileName: string, content: string): Promise<void> {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportSQLiteData(db: SQLiteDatabase): Promise<string> {
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    source: 'sqlite',
    tables: {},
  };

  for (const { name } of tables) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${escapeTableName(name)}`
    );
    payload.tables[name] = rows;
  }

  const content = JSON.stringify(payload, null, 2);
  const fileName = buildFileName();

  if (Platform.OS === 'web') {
    await triggerWebDownload(fileName, content);
    return fileName;
  }

  const file = new File(Paths.document, fileName);
  file.create({ intermediates: true, overwrite: true });
  file.write(content);
  const uri = file.uri;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export SQLite Data',
      UTI: 'public.json',
    });
  }

  return uri;
}

async function readPickedJsonText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    const file = (asset as DocumentPicker.DocumentPickerAsset & { file?: globalThis.File }).file;
    if (file && typeof file.text === 'function') {
      return file.text();
    }
    const res = await fetch(asset.uri);
    return res.text();
  }
  const nativeFile = new File(asset.uri);
  return nativeFile.text();
}

type ImportPayload = {
  tables: Record<string, unknown[]>;
};

function parseImportPayload(raw: string): ImportPayload {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('tables' in parsed)) {
    throw new Error('Invalid backup file format.');
  }
  const tables = (parsed as { tables?: unknown }).tables;
  if (typeof tables !== 'object' || tables === null) {
    throw new Error('Invalid tables data.');
  }
  return { tables: tables as Record<string, unknown[]> };
}

async function getExistingTables(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  return new Set(rows.map((r) => r.name));
}

async function getTableColumns(db: SQLiteDatabase, tableName: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${escapeTableName(tableName)})`
  );
  return rows.map((r) => r.name);
}

export async function importSQLiteData(db: SQLiteDatabase): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) {
    return null;
  }

  const asset = picked.assets[0];
  const rawText = await readPickedJsonText(asset);
  const payload = parseImportPayload(rawText);

  const existingTables = await getExistingTables(db);
  const entries = Object.entries(payload.tables).filter(([tableName, rows]) => {
    return existingTables.has(tableName) && Array.isArray(rows);
  });

  await db.execAsync('PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;');
  try {
    for (const [tableName, rows] of entries) {
      await db.runAsync(`DELETE FROM ${escapeTableName(tableName)}`);
      if (rows.length === 0) continue;

      const tableColumns = await getTableColumns(db, tableName);
      const tableColumnSet = new Set(tableColumns);

      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue;
        const rowRecord = row as Record<string, unknown>;
        const columns = Object.keys(rowRecord).filter((k) => tableColumnSet.has(k));
        if (!columns.length) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${escapeTableName(tableName)} (${columns
          .map(escapeColumnName)
          .join(', ')}) VALUES (${placeholders})`;
        const values = columns.map((k) => toSQLiteBindValue(rowRecord[k]));
        await db.runAsync(sql, ...values);
      }
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  return asset.name ?? 'imported.json';
}
