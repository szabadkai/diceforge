import * as THREE from "three";

export type SphericalPipDimensions = {
  openingRadius: number;
  depth: number;
  sphereRadius: number;
  centerOffset: number;
};

export const MAX_PIP_DIAMETER = 6;

export function sphericalPipDimensions(
  requestedDiameter: number,
  requestedDepth: number,
): SphericalPipDimensions {
  // The control is expressed as a physical opening diameter, so the geometry
  // must follow it directly. A previous face/count limit silently flattened
  // much of the slider range, especially on dice with small faces.
  const openingRadius = requestedDiameter * 0.5;
  // A deeper-than-hemisphere cut creates an undercut, so cap it at the
  // opening radius. Matching depth and radius produces a true hemisphere.
  const depth = Math.min(requestedDepth, openingRadius);
  const sphereRadius = (openingRadius ** 2 + depth ** 2) / (2 * depth);
  return {
    openingRadius,
    depth,
    sphereRadius,
    centerOffset: sphereRadius - depth,
  };
}

export function sphericalCapCentroidDepth(radius: number, depth: number) {
  // Distance from the face plane into the die to the centroid of the removed
  // spherical cap. A hemisphere is 3r/8; a very shallow cap approaches h/3.
  return depth * (4 * radius - depth) / (4 * (3 * radius - depth));
}

export function createSphericalPipCutter(radius: number) {
  const sphere = new THREE.SphereGeometry(radius, 32, 16);
  // Keep the tessellation seams away from the die's symmetric face planes.
  // The surface and center stay spherical; only the triangle grid is rotated.
  sphere.rotateX(0.173);
  sphere.rotateY(0.271);
  sphere.rotateZ(0.119);
  return sphere;
}
