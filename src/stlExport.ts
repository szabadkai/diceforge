import * as THREE from "three";
import ManifoldModule from "manifold-3d";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createDieGeometry,
  faceTransform,
  fitCenteredRectangle,
  getD6SphereCutRadius,
  getDieFaceFrames,
  patternFillScale,
} from "./diceGeometry";
import type { FaceFrame } from "./diceGeometry";
import { getFont } from "./stlFonts";
import { pipLayout } from "./markTexture";
import { createSphericalPipCutter, sphericalPipDimensions } from "./pipGeometry";
import type { DiceConfig } from "./types";
import { createBladeSupportLayout, placeBladeSupportsOnSlicerPlatform } from "./bladeSupports";

type LoadedManifoldModule = Awaited<ReturnType<typeof ManifoldModule>>;
type ManifoldSolid = InstanceType<LoadedManifoldModule["Manifold"]>;

let manifoldModulePromise: Promise<LoadedManifoldModule> | undefined;

function loadManifold() {
  if (!manifoldModulePromise) {
    manifoldModulePromise = ManifoldModule().then((module) => {
      module.setup();
      return module;
    });
  }
  return manifoldModulePromise;
}

function geometryToManifold(module: LoadedManifoldModule, geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.index;
  const vertexMap = new Map<string, number>();
  const oldToNew: number[] = [];
  const vertices: number[] = [];

  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    const x = position.getX(vertexIndex);
    const y = position.getY(vertexIndex);
    const z = position.getZ(vertexIndex);
    const key = `${Math.round(x * 100_000)},${Math.round(y * 100_000)},${Math.round(z * 100_000)}`;
    let weldedIndex = vertexMap.get(key);
    if (weldedIndex === undefined) {
      weldedIndex = vertices.length / 3;
      vertexMap.set(key, weldedIndex);
      vertices.push(x, y, z);
    }
    oldToNew[vertexIndex] = weldedIndex;
  }

  const triangles: number[] = [];
  let signedVolume = 0;
  const cornerCount = index ? index.count : position.count;
  for (let corner = 0; corner < cornerCount; corner += 3) {
    const sourceA = index ? index.getX(corner) : corner;
    const sourceB = index ? index.getX(corner + 1) : corner + 1;
    const sourceC = index ? index.getX(corner + 2) : corner + 2;
    const a = oldToNew[sourceA];
    const b = oldToNew[sourceB];
    const c = oldToNew[sourceC];
    if (a === b || b === c || c === a) continue;
    triangles.push(a, b, c);
    const ax = vertices[a * 3]; const ay = vertices[a * 3 + 1]; const az = vertices[a * 3 + 2];
    const bx = vertices[b * 3]; const by = vertices[b * 3 + 1]; const bz = vertices[b * 3 + 2];
    const cx = vertices[c * 3]; const cy = vertices[c * 3 + 1]; const cz = vertices[c * 3 + 2];
    signedVolume += (
      ax * (by * cz - bz * cy)
      + ay * (bz * cx - bx * cz)
      + az * (bx * cy - by * cx)
    ) / 6;
  }

  if (signedVolume < 0) {
    for (let triangle = 0; triangle < triangles.length; triangle += 3) {
      [triangles[triangle + 1], triangles[triangle + 2]] = [triangles[triangle + 2], triangles[triangle + 1]];
    }
  }

  const mesh = new module.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(vertices),
    triVerts: new Uint32Array(triangles),
  });
  return new module.Manifold(mesh);
}

function manifoldToGeometry(solid: ManifoldSolid) {
  const mesh = solid.getMesh();
  const positions = new Float32Array(mesh.numVert * 3);
  for (let vertex = 0; vertex < mesh.numVert; vertex += 1) {
    positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
    positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 1];
    positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  geometry.computeVertexNormals();
  return geometry;
}

function orientGeometry(geometry: THREE.BufferGeometry, frame: FaceFrame) {
  geometry.applyMatrix4(faceTransform(frame));
  return geometry;
}

function makePipCutters(config: DiceConfig, frames: FaceFrame[]) {
  const cutters: THREE.BufferGeometry[] = [];
  const fill = patternFillScale(config.patternScale);
  frames.slice(0, config.sides).forEach((frame, faceIndex) => {
    const layout = pipLayout(config.values[faceIndex], config.randomPips, config.pipSeed, faceIndex);
    if (!layout.length) return;
    const dimensions = sphericalPipDimensions(
      config.pipSize,
      config.depth,
    );
    layout.forEach(([x, y]) => {
      const sphere = createSphericalPipCutter(dimensions.sphereRadius);
      const position = frame.center
        .clone()
        .addScaledVector(frame.tangent, x * frame.inradius * 1.8 * fill)
        .addScaledVector(frame.bitangent, y * frame.inradius * 1.8 * fill)
        .addScaledVector(frame.normal, dimensions.centerOffset);
      // Moving the sphere center outward creates a wider spherical cap. When
      // diameter / 2 equals depth, the center lies on the face: a hemisphere.
      sphere.translate(position.x, position.y, position.z);
      cutters.push(sphere);
    });
  });
  return cutters;
}

function makeTextCutters(config: DiceConfig, frames: FaceFrame[]) {
  const cutters: THREE.BufferGeometry[] = [];
  const fill = patternFillScale(config.patternScale);
  frames.slice(0, config.sides).forEach((frame, faceIndex) => {
    const value = config.values[faceIndex]?.trim();
    if (!value) return;
    const text = value.slice(0, config.markStyle === "text" ? 12 : 3);
    const geometry = new TextGeometry(text, {
      font: getFont(config.font),
      size: frame.radius,
      depth: config.depth * 2.2,
      curveSegments: 5,
      bevelEnabled: false,
    });
    geometry.computeBoundingBox();
    let box = geometry.boundingBox!;
    const width = Math.max(0.001, box.max.x - box.min.x);
    const height = Math.max(0.001, box.max.y - box.min.y);
    const scale = fitCenteredRectangle(frame, width, height) * fill;
    geometry.scale(scale, scale, 1);
    geometry.computeBoundingBox();
    box = geometry.boundingBox!;
    geometry.translate(
      -(box.min.x + box.max.x) / 2,
      -(box.min.y + box.max.y) / 2,
      -config.depth * 0.8,
    );
    orientGeometry(geometry, frame);
    cutters.push(geometry);
  });
  return cutters;
}

function makeGraphicCutters(config: DiceConfig, frames: FaceFrame[]) {
  const graphics = config.graphicDataSet?.length ? config.graphicDataSet : config.graphicData ? [config.graphicData] : [];
  if (!graphics.length) return [];
  const sources = new Map<string, { geometries: THREE.BufferGeometry[]; bounds: THREE.Box3; dimensions: THREE.Vector3 }>();
  const sourceFor = (graphicData: string) => {
    const cached = sources.get(graphicData);
    if (cached) return cached;
    const encoded = graphicData.split(",")[1] || "";
    const svgText = decodeURIComponent(escape(atob(encoded)));
    const data = new SVGLoader().parse(svgText);
    const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
    if (!shapes.length) return undefined;
    const geometries = shapes.map((shape) => new THREE.ExtrudeGeometry(shape, {
      depth: config.depth * 2.2,
      bevelEnabled: false,
      curveSegments: 5,
    }));
    const bounds = new THREE.Box3();
    geometries.forEach((geometry) => {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    });
    const source = { geometries, bounds, dimensions: bounds.getSize(new THREE.Vector3()) };
    sources.set(graphicData, source);
    return source;
  };

  try {
    const fill = patternFillScale(config.patternScale);
    return frames.slice(0, config.sides).flatMap((frame, faceIndex) => {
      const source = sourceFor(graphics[faceIndex % graphics.length]);
      if (!source) return [];
      const { bounds, dimensions } = source;
      if (!dimensions.x || !dimensions.y) return [];
      const rotation = config.graphicRotations?.length
        ? config.graphicRotations[faceIndex % config.graphicRotations.length]
        : 0;
      const angle = THREE.MathUtils.degToRad(rotation);
      const rotatedWidth = Math.abs(dimensions.x * Math.cos(angle)) + Math.abs(dimensions.y * Math.sin(angle));
      const rotatedHeight = Math.abs(dimensions.x * Math.sin(angle)) + Math.abs(dimensions.y * Math.cos(angle));
      const scale = fitCenteredRectangle(frame, rotatedWidth, rotatedHeight) * fill;
      return source.geometries.map((sourceGeometry) => {
        const geometry = sourceGeometry.clone();
        geometry.translate(
          -(bounds.min.x + bounds.max.x) / 2,
          -(bounds.min.y + bounds.max.y) / 2,
          -config.depth * 0.8,
        );
        geometry.scale(scale, -scale, 1);
        geometry.rotateZ(-angle);
        return orientGeometry(geometry, frame);
      });
    });
  } catch {
    return [];
  } finally {
    sources.forEach((source) => source.geometries.forEach((geometry) => geometry.dispose()));
  }
}

export async function buildDiceStl(config: DiceConfig): Promise<Blob> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const manifold = await loadManifold();
  const baseGeometry = createDieGeometry(
    config.sides,
    config.size,
    config.edge,
    false,
    config.sphereCutAmount,
  );
  const frames = getDieFaceFrames(config.sides, config.size);
  let cutterGeometries: THREE.BufferGeometry[];
  if (config.markStyle === "pips") cutterGeometries = makePipCutters(config, frames);
  else if (config.markStyle === "graphic") cutterGeometries = makeGraphicCutters(config, frames);
  else cutterGeometries = makeTextCutters(config, frames);

  const ownedSolids: ManifoldSolid[] = [];
  let outputGeometry: THREE.BufferGeometry | undefined;
  let supportedOutputGeometry: THREE.BufferGeometry | undefined;
  try {
    let result = geometryToManifold(manifold, baseGeometry);
    ownedSolids.push(result);

    if (config.sides === 6 && config.sphereCut) {
      const sphere = manifold.Manifold.sphere(getD6SphereCutRadius(config.size, config.sphereCutAmount), 96);
      const intersected = result.intersect(sphere);
      ownedSolids.push(sphere, intersected);
      result = intersected;
    }

    if (cutterGeometries.length) {
      const cutterSolids = cutterGeometries.map((geometry) => geometryToManifold(manifold, geometry));
      ownedSolids.push(...cutterSolids);
      const cutterUnion = manifold.Manifold.union(cutterSolids);
      const debossed = result.subtract(cutterUnion);
      ownedSolids.push(cutterUnion, debossed);
      result = debossed;
    }

    // Complex SVG booleans can leave sub-micron sliver triangles on angled
    // faces. Collapse them within a tolerance far below printer resolution.
    if (result.status() !== "NoError" || result.isEmpty() || result.genus() < 0) {
      throw new Error(`Printable mesh validation failed: ${result.status()}`);
    }

    if (config.bladeSupports) {
      const finishedBody = manifoldToGeometry(result);
      const layout = createBladeSupportLayout(
        finishedBody,
        config.sides,
        config.size,
        config.bladeSupportWidth,
      );
      finishedBody.dispose();
      const orientedBody = geometryToManifold(manifold, layout.bodyGeometry);
      const supportSolids = layout.supportGeometries.map((geometry) => geometryToManifold(manifold, geometry));
      ownedSolids.push(orientedBody, ...supportSolids);
      layout.bodyGeometry.dispose();
      layout.supportGeometries.forEach((geometry) => geometry.dispose());
      const invalidSupport = supportSolids.find((solid) => solid.status() !== "NoError" || solid.isEmpty());
      if (invalidSupport) {
        throw new Error(`Blade support generation failed: ${invalidSupport.status()}`);
      }
      const indexedParts = [orientedBody, ...supportSolids].map(manifoldToGeometry);
      const parts = indexedParts.map((geometry) => geometry.toNonIndexed());
      supportedOutputGeometry = mergeGeometries(parts, false) ?? undefined;
      indexedParts.forEach((geometry) => geometry.dispose());
      parts.forEach((geometry) => geometry.dispose());
      if (!supportedOutputGeometry) throw new Error("Blade support mesh merge failed");
    }

    outputGeometry = supportedOutputGeometry ?? manifoldToGeometry(result);
    if (config.bladeSupports) placeBladeSupportsOnSlicerPlatform(outputGeometry);
    const exporter = new STLExporter();
    const bytes = exporter.parse(new THREE.Mesh(outputGeometry), { binary: true }) as DataView;
    return new Blob([bytes.buffer as ArrayBuffer], { type: "model/stl" });
  } finally {
    outputGeometry?.dispose();
    ownedSolids.forEach((solid) => solid.delete());
    cutterGeometries.forEach((geometry) => geometry.dispose());
    baseGeometry.dispose();
  }
}

export async function parseDiceStl(stl: Blob) {
  const loader = new STLLoader();
  return loader.parse(await stl.arrayBuffer());
}

export function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
