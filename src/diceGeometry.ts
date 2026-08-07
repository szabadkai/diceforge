import * as THREE from "three";
import { Brush, Evaluator, INTERSECTION } from "three-bvh-csg";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import type { DieSides } from "./types";

export interface FaceFrame {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
  bitangent: THREE.Vector3;
  radius: number;
}

function pentagonalTrapezohedron(): THREE.BufferGeometry {
  const positions: number[] = [];
  const poleHeight = 1;
  const ringHeight = poleHeight / (2 / (1 - Math.cos(Math.PI / 5)) - 1);
  const top = new THREE.Vector3(0, poleHeight, 0);
  const bottom = new THREE.Vector3(0, -poleHeight, 0);
  const ring = Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const y = i % 2 === 0 ? -ringHeight : ringHeight;
    return new THREE.Vector3(Math.cos(angle), y, Math.sin(angle));
  });

  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a),
    );
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    const vertices = centroid.dot(normal) > 0 ? [a, b, c] : [a, c, b];
    vertices.forEach((vertex) => positions.push(vertex.x, vertex.y, vertex.z));
  };

  for (let i = 0; i < 10; i += 1) {
    const previous = (i + 9) % 10;
    const next = (i + 1) % 10;
    const pole = i % 2 === 0 ? top : bottom;
    pushTriangle(pole, ring[previous], ring[i]);
    pushTriangle(pole, ring[i], ring[next]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function normalized(geometry: THREE.BufferGeometry, size: number): THREE.BufferGeometry {
  const result = geometry.clone();
  result.computeBoundingBox();
  const dimensions = new THREE.Vector3();
  result.boundingBox?.getSize(dimensions);
  const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
  result.scale(scale, scale, scale);
  result.center();
  result.computeVertexNormals();
  return result;
}

export function createSharpDieGeometry(sides: DieSides, size: number): THREE.BufferGeometry {
  switch (sides) {
    case 6:
      return new THREE.BoxGeometry(size, size, size);
    case 8:
      return normalized(new THREE.OctahedronGeometry(1, 0), size);
    case 10:
      return normalized(pentagonalTrapezohedron(), size);
    case 12:
      return normalized(new THREE.DodecahedronGeometry(1, 0), size);
    case 20:
      return normalized(new THREE.IcosahedronGeometry(1, 0), size);
  }
}

function uniqueGeometryVertices(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const vertices: THREE.Vector3[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, index);
    if (!vertices.some((candidate) => candidate.distanceToSquared(vertex) < 0.000001)) {
      vertices.push(vertex);
    }
  }
  return vertices;
}

function insetVertex(
  incidentFaces: FaceFrame[],
  planeDistances: number[],
  radius: number,
) {
  let xx = 0; let xy = 0; let xz = 0;
  let yy = 0; let yz = 0; let zz = 0;
  const right = new THREE.Vector3();
  incidentFaces.forEach((face, index) => {
    const { x, y, z } = face.normal;
    const distance = planeDistances[index] - radius;
    xx += x * x; xy += x * y; xz += x * z;
    yy += y * y; yz += y * z; zz += z * z;
    right.addScaledVector(face.normal, distance);
  });
  const matrix = new THREE.Matrix3().set(xx, xy, xz, xy, yy, yz, xz, yz, zz);
  return right.applyMatrix3(matrix.invert());
}

function roundedConvexGeometry(sharp: THREE.BufferGeometry, requestedRadius: number) {
  const faces = getFaceFrames(sharp);
  const vertices = uniqueGeometryVertices(sharp);
  const tolerance = 0.002;
  const planeDistance = faces.map((face) => face.normal.dot(face.center));
  const incidents = vertices.map((vertex) => faces
    .map((face, index) => ({ face, index }))
    .filter(({ face, index }) => Math.abs(face.normal.dot(vertex) - planeDistance[index]) < tolerance),
  );

  const edges: Array<{ a: number; b: number; faces: number[] }> = [];
  for (let a = 0; a < vertices.length; a += 1) {
    for (let b = a + 1; b < vertices.length; b += 1) {
      const shared = incidents[a]
        .map(({ index }) => index)
        .filter((index) => incidents[b].some((candidate) => candidate.index === index));
      if (shared.length === 2) edges.push({ a, b, faces: shared });
    }
  }

  const minimumEdge = Math.min(...edges.map(({ a, b }) => vertices[a].distanceTo(vertices[b])));
  const inradius = Math.min(...planeDistance);
  const radius = Math.max(0.05, Math.min(requestedRadius, minimumEdge * 0.34, inradius * 0.46));
  const insetVertices = incidents.map((incident) => insetVertex(
    incident.map(({ face }) => face),
    incident.map(({ index }) => planeDistance[index]),
    radius,
  ));
  const points: THREE.Vector3[] = [];

  // Original face planes remain tangent to a sphere swept around the inset solid.
  incidents.forEach((incident, vertexIndex) => {
    incident.forEach(({ face }) => points.push(
      insetVertices[vertexIndex].clone().addScaledVector(face.normal, radius),
    ));
  });

  // Three samples across each normal arc make a cylindrical edge fillet.
  edges.forEach(({ a, b, faces: [first, second] }) => {
    [0.25, 0.5, 0.75].forEach((mix) => {
      const normal = faces[first].normal.clone().multiplyScalar(1 - mix)
        .addScaledVector(faces[second].normal, mix).normalize();
      points.push(
        insetVertices[a].clone().addScaledVector(normal, radius),
        insetVertices[b].clone().addScaledVector(normal, radius),
      );
    });
  });

  // The blended normal cap is the spherical cut at each corner (especially visible on D6).
  incidents.forEach((incident, vertexIndex) => {
    const cornerNormal = incident.reduce(
      (sum, { face }) => sum.add(face.normal),
      new THREE.Vector3(),
    ).normalize();
    points.push(insetVertices[vertexIndex].clone().addScaledVector(cornerNormal, radius));
    incident.forEach(({ face }) => {
      const blended = face.normal.clone().lerp(cornerNormal, 0.5).normalize();
      points.push(insetVertices[vertexIndex].clone().addScaledVector(blended, radius));
    });
  });

  const geometry = new ConvexGeometry(points);
  geometry.computeVertexNormals();
  return geometry;
}

function sphereCutGeometry(geometry: THREE.BufferGeometry, size: number, amount: number) {
  const half = size / 2;
  const cornerRadius = Math.sqrt(3) * half;
  const edgeRadius = Math.sqrt(2) * half;
  const strength = THREE.MathUtils.clamp(amount, 0, 1);
  const sphereRadius = THREE.MathUtils.lerp(cornerRadius - 0.02, edgeRadius + 0.03, strength);
  const dieBrush = new Brush(geometry);
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 48, 32);
  const sphereBrush = new Brush(sphereGeometry);
  dieBrush.updateMatrixWorld();
  sphereBrush.updateMatrixWorld();
  const evaluator = new Evaluator();
  evaluator.attributes = ["position", "normal"];
  const result = evaluator.evaluate(dieBrush, sphereBrush, INTERSECTION);
  const output = result.geometry.clone();
  sphereGeometry.dispose();
  return output;
}

export function createDieGeometry(
  sides: DieSides,
  size: number,
  edge = 1.2,
  sphereCut = false,
  sphereCutAmount = 0.55,
): THREE.BufferGeometry {
  const sharp = createSharpDieGeometry(sides, size);
  const rounded = roundedConvexGeometry(sharp, edge);
  sharp.dispose();
  if (sides === 6 && sphereCut) {
    const cut = sphereCutGeometry(rounded, size, sphereCutAmount);
    rounded.dispose();
    return cut;
  }
  return rounded;
}

export function getFaceFrames(geometry: THREE.BufferGeometry): FaceFrame[] {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = flat.getAttribute("position");
  const groups: Array<{
    normal: THREE.Vector3;
    plane: number;
    area: number;
    vertices: THREE.Vector3[];
    centroids: THREE.Vector3[];
  }> = [];

  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a),
    ).normalize();
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    const area = new THREE.Triangle(a, b, c).getArea();
    if (normal.dot(centroid) < 0) normal.negate();
    const plane = normal.dot(centroid);
    let group = groups.find((candidate) =>
      candidate.normal.dot(normal) > 0.997 && Math.abs(candidate.plane - plane) < 0.04,
    );
    if (!group) {
      group = { normal, plane, area: 0, vertices: [], centroids: [] };
      groups.push(group);
    }
    group.area += area;
    group.vertices.push(a, b, c);
    group.centroids.push(centroid);
  }

  return groups.map((group) => {
    const center = group.centroids
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .multiplyScalar(1 / group.centroids.length);
    const normal = group.normal.clone().normalize();
    const guide = Math.abs(normal.y) < 0.86
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(guide, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const uniqueVertices = group.vertices.filter((vertex, index, all) =>
      all.findIndex((other) => other.distanceToSquared(vertex) < 0.0001) === index,
    );
    const radius = Math.max(...uniqueVertices.map((vertex) => vertex.distanceTo(center))) * 0.48;
    return { center, normal, tangent, bitangent, radius };
  }).sort((a, b) => {
    const elevation = b.normal.y - a.normal.y;
    if (Math.abs(elevation) > 0.02) return elevation;
    return Math.atan2(a.normal.z, a.normal.x) - Math.atan2(b.normal.z, b.normal.x);
  });
}

export function getDieFaceFrames(sides: DieSides, size: number) {
  const sharp = createSharpDieGeometry(sides, size);
  const frames = getFaceFrames(sharp);
  sharp.dispose();
  return frames;
}

export function faceTransform(frame: FaceFrame): THREE.Matrix4 {
  const rotation = new THREE.Matrix4().makeBasis(frame.tangent, frame.bitangent, frame.normal);
  const translation = new THREE.Matrix4().makeTranslation(
    frame.center.x,
    frame.center.y,
    frame.center.z,
  );
  return translation.multiply(rotation);
}
