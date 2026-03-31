export function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDate(value: Date): string {
  return `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;
}

export function formatDateTime(value: Date): string {
  return `${formatDate(value)} ${padNumber(value.getHours())}:${padNumber(value.getMinutes())}:${padNumber(value.getSeconds())}`;
}

export function todayString(): string {
  return formatDate(new Date());
}

export function formatShortDateTime(raw: string): string {
  if (!raw) return '-';
  const [datePart, timePart = ''] = raw.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');
  return `${year}.${month}.${day} ${timePart.slice(0, 5)}`.trim();
}

export function formatShortDate(raw: string): string {
  if (!raw) return '-';
  const [datePart] = raw.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');
  return `${year}.${month}.${day}`;
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
