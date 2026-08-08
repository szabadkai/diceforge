export function fillFaceSet<T>(items: T[], faceCount: number): T[] {
  if (!items.length || faceCount <= 0) return [];
  return Array.from({ length: faceCount }, (_, index) => items[index % items.length]);
}

export function swapFaceAssignments<T>(items: T[], from: number, to: number, faceCount: number): T[] {
  const assignments = fillFaceSet(items, faceCount);
  if (
    from === to
    || from < 0
    || to < 0
    || from >= assignments.length
    || to >= assignments.length
  ) return assignments;
  [assignments[from], assignments[to]] = [assignments[to], assignments[from]];
  return assignments;
}
