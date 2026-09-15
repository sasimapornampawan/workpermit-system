export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// Date-only strings parse as UTC midnight; anchor them to local time so they stay in the right month.
export const localDate = (isoDate: string) => new Date(isoDate.length === 10 ? `${isoDate}T00:00` : isoDate);

export function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

export const pct = (n: number, max: number) => `${Math.round((n / Math.max(max, 1)) * 100)}%`;
