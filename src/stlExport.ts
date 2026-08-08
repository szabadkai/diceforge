import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createDieGeometry,
  faceTransform,
  fitCenteredRectangle,
  getDieFaceFrames,
  patternFillScale,
} from "./diceGeometry";
import type { FaceFrame } from "./diceGeometry";
import { getFont } from "./stlFonts";
import { pipLayout } from "./markTexture";
import type { DiceConfig } from "./types";

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
    const radius = Math.min(
      frame.inradius * 0.13 * fill / Math.max(1, Math.sqrt(layout.length / 6)),
      0.92,
    );
    layout.forEach(([x, y]) => {
      const cylinder = new THREE.CylinderGeometry(radius, radius * 0.9, config.depth * 2.2, 48, 1, false);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), frame.normal);
      cylinder.applyQuaternion(quaternion);
      const position = frame.center
        .clone()
        .addScaledVector(frame.tangent, x * frame.inradius * 1.8 * fill)
        .addScaledVector(frame.bitangent, y * frame.inradius * 1.8 * fill)
        .addScaledVector(frame.normal, -config.depth * 0.2);
      cylinder.translate(position.x, position.y, position.z);
      cutters.push(cylinder);
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
  if (!config.graphicData) return [];
  try {
    const encoded = config.graphicData.split(",")[1] || "";
    const svgText = decodeURIComponent(escape(atob(encoded)));
    const data = new SVGLoader().parse(svgText);
    const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
    if (!shapes.length) return [];
    const source = mergeGeometries(
      shapes.map((shape) => new THREE.ExtrudeGeometry(shape, {
        depth: config.depth * 2.2,
        bevelEnabled: false,
        curveSegments: 5,
      })),
      false,
    );
    if (!source) return [];
    source.computeBoundingBox();
    const bounds = source.boundingBox!;
    const dimensions = new THREE.Vector3();
    bounds.getSize(dimensions);
    if (!dimensions.x || !dimensions.y) return [];
    const fill = patternFillScale(config.patternScale);

    return frames.slice(0, config.sides).map((frame) => {
      const geometry = source.clone();
      const scale = fitCenteredRectangle(frame, dimensions.x, dimensions.y) * fill;
      geometry.translate(
        -(bounds.min.x + bounds.max.x) / 2,
        -(bounds.min.y + bounds.max.y) / 2,
        -config.depth * 0.8,
      );
      geometry.scale(scale, -scale, 1);
      return orientGeometry(geometry, frame);
    });
  } catch {
    return [];
  }
}

export async function buildDiceStl(config: DiceConfig): Promise<Blob> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const baseGeometry = createDieGeometry(
    config.sides,
    config.size,
    config.edge,
    config.sphereCut,
    config.sphereCutAmount,
  );
  const frames = getDieFaceFrames(config.sides, config.size);
  let cutterGeometries: THREE.BufferGeometry[];
  if (config.markStyle === "pips") cutterGeometries = makePipCutters(config, frames);
  else if (config.markStyle === "graphic") cutterGeometries = makeGraphicCutters(config, frames);
  else cutterGeometries = makeTextCutters(config, frames);

  const baseBrush = new Brush(baseGeometry);
  baseBrush.updateMatrixWorld();
  let result: THREE.Mesh = baseBrush;

  if (cutterGeometries.length) {
    const merged = mergeGeometries(cutterGeometries, false);
    if (merged) {
      const cutterBrush = new Brush(merged);
      cutterBrush.updateMatrixWorld();
      const evaluator = new Evaluator();
      evaluator.attributes = ["position", "normal"];
      result = evaluator.evaluate(baseBrush, cutterBrush, SUBTRACTION);
      merged.dispose();
    }
  }

  const exporter = new STLExporter();
  const bytes = exporter.parse(result, { binary: true }) as DataView;
  cutterGeometries.forEach((geometry) => geometry.dispose());
  baseGeometry.dispose();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "model/stl" });
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
