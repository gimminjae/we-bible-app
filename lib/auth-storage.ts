import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const STORAGE_DIR = `${FileSystem.documentDirectory ?? ''}supabase-auth`;

function getFilePath(key: string) {
  const safeKey = encodeURIComponent(key);
  return `${STORAGE_DIR}/${safeKey}.json`;
}

async function ensureStorageDir() {
  if (Platform.OS === 'web' || !STORAGE_DIR) return;
  const info = await FileSystem.getInfoAsync(STORAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
  }
}

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }

    try {
      const path = getFilePath(key);
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(path);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }

    await ensureStorageDir();
    await FileSystem.writeAsStringAsync(getFilePath(key), value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }

    try {
      await FileSystem.deleteAsync(getFilePath(key), { idempotent: true });
    } catch {
      // Ignore storage cleanup errors.
    }
  },
};
