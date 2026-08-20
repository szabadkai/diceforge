import * as THREE from "three";
import { getDieFaceFrames } from "./diceGeometry";
import type { DieSides } from "./types";

function oppositeFace(frames: ReturnType<typeof getDieFaceFrames>, faceIndex: number) {
  let opposite = -1;
  let minimumDot = Number.POSITIVE_INFINITY;
  frames.forEach((frame, index) => {
    const dot = frames[faceIndex].normal.dot(frame.normal);
    if (index !== faceIndex && dot < minimumDot) {
      minimumDot = dot;
      opposite = index;
    }
  });
  return opposite;
}

function adjacentFaces(frames: ReturnType<typeof getDieFaceFrames>, faceIndex: number) {
  return frames
    .map((frame, index) => ({ index, dot: frames[faceIndex].normal.dot(frame.normal) }))
    .filter(({ index }) => index !== faceIndex)
    .sort((a, b) => b.dot - a.dot)
    .slice(0, frames[faceIndex].polygon.length)
    .map(({ index }) => index);
}

function cyclicOrder(
  frames: ReturnType<typeof getDieFaceFrames>,
  faceIndices: number[],
  axis: THREE.Vector3,
  anchor = faceIndices[0],
) {
  const guide = Math.abs(axis.y) < 0.86
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(guide, axis).normalize();
  const bitangent = new THREE.Vector3().crossVectors(axis, tangent).normalize();
  const ordered = [...faceIndices].sort((a, b) => {
    const angle = (index: number) => Math.atan2(
      frames[index].normal.dot(bitangent),
      frames[index].normal.dot(tangent),
    );
    return angle(a) - angle(b);
  });
  const anchorIndex = ordered.indexOf(anchor);
  return anchorIndex < 0
    ? ordered
    : [...ordered.slice(anchorIndex), ...ordered.slice(0, anchorIndex)];
}

function d6FaceOrder(frames: ReturnType<typeof getDieFaceFrames>) {
  const nearest = (direction: THREE.Vector3) => frames
    .map((frame, index) => ({ index, dot: frame.normal.dot(direction) }))
    .sort((a, b) => b.dot - a.dot)[0].index;
  const top = nearest(new THREE.Vector3(0, 1, 0));
  const front = nearest(new THREE.Vector3(0, 0, -1));
  const right = nearest(new THREE.Vector3(1, 0, 0));
  return [
    top,
    front,
    right,
    oppositeFace(frames, top),
    oppositeFace(frames, front),
    oppositeFace(frames, right),
  ];
}

function upperBandOrder(frames: ReturnType<typeof getDieFaceFrames>) {
  const upper = frames
    .map((frame, index) => ({ frame, index }))
    .filter(({ frame }) => frame.normal.y > 0)
    .map(({ index }) => index);
  const first = Math.min(...upper);
  const ordered = cyclicOrder(frames, upper, new THREE.Vector3(0, 1, 0), first);
  return [...ordered, ...ordered.map((index) => oppositeFace(frames, index))];
}

function d12FaceOrder(frames: ReturnType<typeof getDieFaceFrames>) {
  const top = 0;
  const ring = cyclicOrder(frames, adjacentFaces(frames, top), frames[top].normal);
  const upper = [top, ...ring];
  return [...upper, ...upper.map((index) => oppositeFace(frames, index))];
}

function d20FaceOrder(frames: ReturnType<typeof getDieFaceFrames>) {
  const top = 0;
  const innerRing = cyclicOrder(frames, adjacentFaces(frames, top), frames[top].normal);
  const innerSet = new Set([top, ...innerRing]);
  const outerRing = cyclicOrder(
    frames,
    [...new Set(innerRing.flatMap((index) => adjacentFaces(frames, index)))]
      .filter((index) => !innerSet.has(index)),
    frames[top].normal,
  );
  const upper = [top, ...innerRing, ...outerRing];
  return [...upper, ...upper.map((index) => oppositeFace(frames, index))];
}

const STANDARD_VALUES: Record<DieSides, number[]> = {
  // Right-handed D6: with 6 on top, 5 is on the right and 4 is in front.
  6: [6, 4, 5, 1, 3, 2],
  // Common polyhedral layouts, listed as an upper half followed by its
  // corresponding opposite faces. Each opposite pair has a constant sum.
  8: [8, 6, 4, 2, 1, 3, 5, 7],
  10: [9, 1, 7, 3, 5, 0, 8, 2, 6, 4],
  12: [12, 11, 10, 8, 7, 9, 1, 2, 3, 5, 6, 4],
  20: [20, 2, 8, 14, 18, 12, 10, 16, 6, 4, 1, 19, 13, 7, 3, 9, 11, 5, 15, 17],
};

/** Values arranged on the mesh like a conventional tabletop die. */
export function standardDieValues(sides: DieSides) {
  const frames = getDieFaceFrames(sides, 24);
  const order = sides === 6
    ? d6FaceOrder(frames)
    : sides === 8 || sides === 10
      ? upperBandOrder(frames)
      : sides === 12
        ? d12FaceOrder(frames)
        : d20FaceOrder(frames);
  const values = Array.from({ length: sides }, () => "");
  order.forEach((faceIndex, index) => {
    values[faceIndex] = String(STANDARD_VALUES[sides][index]);
  });
  return values;
}
