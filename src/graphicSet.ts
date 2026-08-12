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
