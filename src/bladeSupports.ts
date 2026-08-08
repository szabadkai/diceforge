import * as THREE from "three";
import { getDieFaceFrames } from "./diceGeometry";
import type { FaceFrame } from "./diceGeometry";
import type { DieSides } from "./types";

export const BLADE_SUPPORT_THICKNESS = 0.35;
export const BLADE_SUPPORT_FOOT_WIDTH = 2.2;
export const BLADE_SUPPORT_FOOT_HEIGHT = 0.8;

type Edge = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  faces: FaceFrame[];
};

function pointKey(point: THREE.Vector3) {
  return [point.x, point.y, point.z].map((value) => Math.round(value * 10_000)).join(",");
}

function frameVertex(frame: FaceFrame, point: THREE.Vector2) {
  return frame.center
    .clone()
    .addScaledVector(frame.tangent, point.x)
    .addScaledVector(frame.bitangent, point.y);
}

function dieEdges(frames: FaceFrame[]) {
  const edges = new Map<string, Edge>();
  frames.forEach((frame) => {
    const vertices = frame.polygon.map((point) => frameVertex(frame, point));
    vertices.forEach((a, index) => {
      const b = vertices[(index + 1) % vertices.length];
      const aKey = pointKey(a);
      const bKey = pointKey(b);
      const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
      const existing = edges.get(key);
      if (existing) existing.faces.push(frame);
      else edges.set(key, { a, b, faces: [frame] });
    });
  });
  return [...edges.values()];
}

function uniqueFrameVertices(frames: FaceFrame[]) {
  const vertices = new Map<string, THREE.Vector3>();
  frames.forEach((frame) => frame.polygon.forEach((point) => {
    const vertex = frameVertex(frame, point);
    vertices.set(pointKey(vertex), vertex);
  }));
  return [...vertices.values()];
}

/**
 * Dice are most reliable in resin when they begin at a single minimum rather
 * than exposing a whole face at once. D10 uses its long pole; the regular
 * solids use a vertex. The returned matrix maps that deterministic tip down.
 */
export function idealDiceOrientation(sides: DieSides, size: number) {
  const frames = getDieFaceFrames(sides, size);
  const vertices = uniqueFrameVertices(frames);
  const tip = vertices.sort((a, b) => {
    const elevation = b.y - a.y;
    if (Math.abs(elevation) > 0.0001) return elevation;
    const azimuth = Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
    return Math.abs(azimuth) > 0.0001 ? azimuth : b.x - a.x;
  })[0];
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    tip.clone().normalize(),
    new THREE.Vector3(0, -1, 0),
  );
  return new THREE.Matrix4().makeRotationFromQuaternion(rotation);
}

function transformedFrame(frame: FaceFrame, matrix: THREE.Matrix4): FaceFrame {
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  return {
    ...frame,
    center: frame.center.clone().applyMatrix4(matrix),
    normal: frame.normal.clone().applyMatrix3(normalMatrix).normalize(),
    tangent: frame.tangent.clone().applyMatrix3(normalMatrix).normalize(),
    bitangent: frame.bitangent.clone().applyMatrix3(normalMatrix).normalize(),
    polygon: frame.polygon.map((point) => point.clone()),
  };
}

function rayHeight(
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh,
  x: number,
  z: number,
  rayFloor: number,
) {
  raycaster.set(new THREE.Vector3(x, rayFloor, z), new THREE.Vector3(0, 1, 0));
  return raycaster.intersectObject(mesh, false)[0]?.point.y;
}

function bladeGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  topHeights: number[],
  platformTop: number,
  supportWidth: number,
) {
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = direction.length();
  if (length < 0.5) return undefined;
  direction.normalize();
  const normal = new THREE.Vector3(-direction.z, 0, direction.x);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const shape = new THREE.Shape();
  shape.moveTo(-length * 0.5, platformTop - 0.04);
  topHeights.forEach((height, index) => {
    const along = THREE.MathUtils.lerp(-length * 0.5, length * 0.5, index / (topHeights.length - 1));
    shape.lineTo(along, height + 0.12);
  });
  shape.lineTo(length * 0.5, platformTop - 0.04);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: supportWidth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -supportWidth * 0.5);
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(
    direction,
    new THREE.Vector3(0, 1, 0),
    normal,
  ));
  geometry.translate(center.x, 0, center.z);
  return geometry;
}

function footGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  platformTop: number,
  stagger: number,
  supportWidth: number,
) {
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = direction.length() + 1.8;
  if (length < 0.5) return undefined;
  direction.normalize();
  const normal = new THREE.Vector3(-direction.z, 0, direction.x);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const geometry = new THREE.BoxGeometry(
    length,
    BLADE_SUPPORT_FOOT_HEIGHT,
    Math.max(BLADE_SUPPORT_FOOT_WIDTH, supportWidth * 2.5),
  );
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(
    direction,
    new THREE.Vector3(0, 1, 0),
    normal,
  ));
  // A microscopic height stagger prevents crossing rail feet from presenting
  // coincident coplanar faces to boolean engines. It is far below one resin
  // layer and the deepest rail still defines the exact platform plane.
  geometry.translate(center.x, platformTop - BLADE_SUPPORT_FOOT_HEIGHT * 0.5 - stagger, center.z);
  return geometry;
}

export type BladeSupportLayout = {
  bodyGeometry: THREE.BufferGeometry;
  supportGeometries: THREE.BufferGeometry[];
  platformTop: number;
};

/** Orients a finished die and derives printable fins from its real underside. */
export function createBladeSupportLayout(
  bodyGeometry: THREE.BufferGeometry,
  sides: DieSides,
  size: number,
  requestedSupportWidth = BLADE_SUPPORT_THICKNESS,
): BladeSupportLayout {
  const supportWidth = THREE.MathUtils.clamp(requestedSupportWidth, 0.3, 1.2);
  const orientation = idealDiceOrientation(sides, size);
  const orientedBody = bodyGeometry.clone().applyMatrix4(orientation);
  orientedBody.computeBoundingBox();
  const lift = Math.max(4, size * 0.22);
  const platformTop = 0;
  const translateY = lift - (orientedBody.boundingBox?.min.y ?? 0);
  const placement = new THREE.Matrix4().makeTranslation(0, translateY, 0).multiply(orientation);
  orientedBody.translate(0, translateY, 0);
  orientedBody.computeBoundingBox();

  const frames = getDieFaceFrames(sides, size).map((frame) => transformedFrame(frame, placement));
  const edges = dieEdges(frames);
  const mesh = new THREE.Mesh(orientedBody, new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
  mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const rayFloor = (orientedBody.boundingBox?.min.y ?? lift) - 1;
  const supportGeometries: THREE.BufferGeometry[] = [];
  let footIndex = 0;
  const lowestSharpVertex = Math.min(...edges.flatMap((edge) => [edge.a.y, edge.b.y]));
  const tipHeight = rayHeight(raycaster, mesh, 0, 0, rayFloor);
  if (tipHeight !== undefined) {
    const hubBottom = platformTop - 0.04;
    const hubHeight = tipHeight + 0.12 - hubBottom;
    const hub = new THREE.CylinderGeometry(
      Math.max(0.9, supportWidth * 1.6),
      Math.max(0.9, supportWidth * 1.6),
      hubHeight,
      32,
    );
    hub.translate(0, hubBottom + hubHeight * 0.5, 0);
    supportGeometries.push(hub);
  }

  edges.forEach((edge) => {
    // Once the first tip has printed, every later perimeter is carried by the
    // solid layers below it. Only retain the radial/spoke edges born at that
    // first minimum; supporting the outer ring merely creates a fence.
    if (Math.min(edge.a.y, edge.b.y) > lowestSharpVertex + 0.01) return;
    const downwardFaces = edge.faces.filter((face) => face.normal.y < -0.08);
    if (!downwardFaces.length) return;
    const faceCenter = downwardFaces
      .reduce((sum, face) => sum.add(face.center), new THREE.Vector3())
      .multiplyScalar(1 / downwardFaces.length);

    let start = edge.a.clone();
    let end = edge.b.clone();
    let heights: number[] = [];
    // Stay close to the edge, but move inward when a large fillet removes the
    // sharp mathematical edge. The vertical rays land on the actual STL body.
    for (const inset of [0.92, 0.86, 0.78, 0.68]) {
      start = faceCenter.clone().lerp(edge.a, inset);
      end = faceCenter.clone().lerp(edge.b, inset);
      heights = Array.from({ length: 7 }, (_, index) => {
        const point = start.clone().lerp(end, index / 6);
        return rayHeight(raycaster, mesh, point.x, point.z, rayFloor);
      }).filter((height): height is number => height !== undefined);
      if (heights.length === 7) break;
    }
    if (heights.length !== 7 || Math.min(...heights) <= platformTop + 0.2) return;
    const blade = bladeGeometry(start, end, heights, platformTop, supportWidth);
    const foot = footGeometry(start, end, platformTop, footIndex * 0.001, supportWidth);
    footIndex += 1;
    if (blade) supportGeometries.push(blade);
    if (foot) supportGeometries.push(foot);
  });

  mesh.material.dispose();
  return { bodyGeometry: orientedBody, supportGeometries, platformTop };
}

/** Maps Three.js Y-up support geometry to the slicer's conventional Z-up axis. */
export function placeBladeSupportsOnSlicerPlatform(geometry: THREE.BufferGeometry) {
  geometry.rotateX(Math.PI / 2);
  geometry.computeBoundingBox();
  geometry.translate(0, 0, -(geometry.boundingBox?.min.z ?? 0));
  geometry.computeBoundingBox();
  return geometry;
}
