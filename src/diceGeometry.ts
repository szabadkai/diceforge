import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
    const outward = centroid.dot(normal) > 0;
    const vertices = outward ? [a, b, c] : [a, c, b];
    vertices.forEach((v) => positions.push(v.x, v.y, v.z));
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

export function createDieGeometry(sides: DieSides, size: number, edge = 1.2): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry;
  switch (sides) {
    case 6:
      geometry = new RoundedBoxGeometry(size, size, size, 5, Math.min(edge, size * 0.12));
      break;
    case 8:
      geometry = normalized(new THREE.OctahedronGeometry(1, 0), size);
      break;
    case 10:
      geometry = normalized(pentagonalTrapezohedron(), size);
      break;
    case 12:
      geometry = normalized(new THREE.DodecahedronGeometry(1, 0), size);
      break;
    case 20:
      geometry = normalized(new THREE.IcosahedronGeometry(1, 0), size);
      break;
  }
  geometry.computeVertexNormals();
  return geometry;
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

  const visibleGroups = groups.length > 100
    ? [...groups].sort((a, b) => b.area - a.area).slice(0, 6)
    : groups;

  return visibleGroups
    .map((group) => {
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
    })
    .sort((a, b) => {
      const elevation = b.normal.y - a.normal.y;
      if (Math.abs(elevation) > 0.02) return elevation;
      return Math.atan2(a.normal.z, a.normal.x) - Math.atan2(b.normal.z, b.normal.x);
    });
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
