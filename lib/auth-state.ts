let activeUserId: string | null = null;

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function setActiveUserId(userId: string | null): void {
  activeUserId = userId;
}
