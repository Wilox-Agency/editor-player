export function findLastIndex<T>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => unknown
) {
  const index = [...array].reverse().findIndex(predicate);
  if (index === -1) return -1;

  const lastArrayIndex = array.length - 1;
  return lastArrayIndex - index;
}
