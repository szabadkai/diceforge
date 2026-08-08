import * as THREE from "three";

export function hemisphericalPipRadius(
  faceInradius: number,
  fill: number,
  pipCount: number,
  requestedDepth: number,
) {
  const faceLimit = Math.min(
    faceInradius * 0.13 * fill / Math.max(1, Math.sqrt(pipCount / 6)),
    0.92,
  );
  return Math.min(faceLimit, requestedDepth);
}

export function createHemisphericalPipCutter(radius: number) {
  const sphere = new THREE.SphereGeometry(radius, 32, 16);
  // Keep the tessellation seams away from the die's symmetric face planes.
  // The surface and center stay spherical; only the triangle grid is rotated.
  sphere.rotateX(0.173);
  sphere.rotateY(0.271);
  sphere.rotateZ(0.119);
  return sphere;
}
