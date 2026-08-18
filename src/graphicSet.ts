export function fillFaceSet<T>(items: T[], faceCount: number): T[] {
  if (!items.length || faceCount <= 0) return [];
  return Array.from({ length: faceCount }, (_, index) => items[index % items.length]);
}

export function fitGraphicSelection<T>(pool: T[], current: T[], faceCount: number): T[] {
  if (!pool.length || faceCount <= 0) return [];
  const selected: T[] = [];
  for (const item of current) {
    if (pool.includes(item) && !selected.includes(item)) selected.push(item);
    if (selected.length === faceCount) return selected;
  }
  for (const item of pool) {
    if (!selected.includes(item)) selected.push(item);
    if (selected.length === faceCount) return selected;
  }
  return fillFaceSet(selected, faceCount);
}

export function assignGraphicToFace<T>(
  pool: T[],
  current: T[],
  faceIndex: number,
  graphic: T,
  faceCount: number,
): T[] {
  const assignments = fitGraphicSelection(pool, current, faceCount);
  if (faceIndex < 0 || faceIndex >= assignments.length || !pool.includes(graphic)) return assignments;
  const existingIndex = assignments.indexOf(graphic);
  if (existingIndex >= 0 && existingIndex !== faceIndex) {
    [assignments[faceIndex], assignments[existingIndex]] = [assignments[existingIndex], assignments[faceIndex]];
  } else {
    assignments[faceIndex] = graphic;
  }
  return assignments;
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

export function setFaceRotation(
  rotations: number[],
  faceIndex: number,
  rotation: number,
  faceCount: number,
): number[] {
  const assignments = fillFaceSet(rotations.length ? rotations : [0], faceCount);
  if (faceIndex < 0 || faceIndex >= assignments.length) return assignments;
  assignments[faceIndex] = Math.max(0, Math.min(360, Math.round(rotation)));
  return assignments;
}

export function removeGraphicAssignments(
  graphics: string[],
  names: string[],
  rotations: number[],
  graphicToRemove: string,
) {
  const alignedNames = fillFaceSet(names.length ? names : ["Custom SVG"], graphics.length);
  const alignedRotations = fillFaceSet(rotations.length ? rotations : [0], graphics.length);
  const keptIndices = graphics
    .map((graphic, index) => graphic === graphicToRemove ? -1 : index)
    .filter((index) => index >= 0);
  return {
    graphics: keptIndices.map((index) => graphics[index]),
    names: keptIndices.map((index) => alignedNames[index]),
    rotations: keptIndices.map((index) => alignedRotations[index]),
  };
}
