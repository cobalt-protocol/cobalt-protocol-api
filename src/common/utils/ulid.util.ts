import { ulid } from 'ulid';

export function generateUlid(
  timestamp?: number | string | Date | null,
): string {
  if (timestamp === null || timestamp === undefined) {
    return ulid();
  }
  if (timestamp instanceof Date) {
    return ulid(timestamp.getTime());
  }
  if (typeof timestamp === 'number') {
    return ulid(timestamp);
  }
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      return ulid(parsed);
    }
  }
  return ulid();
}
