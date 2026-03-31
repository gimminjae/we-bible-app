let sqliteStateSyncPauseCount = 0;

export function pauseSQLiteStateSync(): void {
  sqliteStateSyncPauseCount += 1;
}

export function resumeSQLiteStateSync(): void {
  sqliteStateSyncPauseCount = Math.max(0, sqliteStateSyncPauseCount - 1);
}

export function isSQLiteStateSyncPaused(): boolean {
  return sqliteStateSyncPauseCount > 0;
}
