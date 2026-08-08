import * as THREE from "three";

export type SphericalPipDimensions = {
  openingRadius: number;
  depth: number;
  sphereRadius: number;
  centerOffset: number;
};

export function sphericalPipDimensions(
  faceInradius: number,
  fill: number,
  pipCount: number,
  requestedDiameter: number,
  requestedDepth: number,
): SphericalPipDimensions {
  const faceLimit = faceInradius * 0.13 * fill / Math.max(1, Math.sqrt(pipCount / 6));
  const openingRadius = Math.min(faceLimit, requestedDiameter * 0.5);
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

export function createSphericalPipCutter(radius: number) {
  const sphere = new THREE.SphereGeometry(radius, 32, 16);
  // Keep the tessellation seams away from the die's symmetric face planes.
  // The surface and center stay spherical; only the triangle grid is rotated.
  sphere.rotateX(0.173);
  sphere.rotateY(0.271);
  sphere.rotateZ(0.119);
  return sphere;
}
