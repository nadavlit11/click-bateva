/**
 * Distribute N items evenly across numDays days.
 * Returns a 1-indexed day number for each item, in order.
 * Example: 7 items, 3 days → [1,1,1, 2,2,2, 3]
 */
export function distributeToDays(count: number, numDays: number): number[] {
  if (count === 0 || numDays === 0) return [];
  const perDay = Math.ceil(count / numDays);
  return Array.from({ length: count }, (_, i) => Math.floor(i / perDay) + 1);
}
