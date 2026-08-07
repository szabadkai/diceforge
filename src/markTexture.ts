import * as THREE from "three";
import type { MarkStyle } from "./types";

const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.27, -0.27], [0.27, 0.27]],
  3: [[-0.3, -0.3], [0, 0], [0.3, 0.3]],
  4: [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]],
  5: [[-0.3, -0.3], [0.3, -0.3], [0, 0], [-0.3, 0.3], [0.3, 0.3]],
  6: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  7: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, 0], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  8: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, -0.18], [0, 0.18], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  9: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, -0.34], [0, 0], [0, 0.34], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
};

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomLayout(count: number, seed: number): Array<[number, number]> {
  const random = randomSource(seed);
  const points: Array<[number, number]> = [];
  const minimumDistance = count <= 6 ? 0.2 : count <= 10 ? 0.145 : 0.105;
  let attempts = 0;
  while (points.length < count && attempts < 1200) {
    attempts += 1;
    const candidate: [number, number] = [(random() - 0.5) * 0.78, (random() - 0.5) * 0.78];
    if (candidate[0] ** 2 + candidate[1] ** 2 > 0.205) continue;
    if (points.every(([x, y]) => Math.hypot(x - candidate[0], y - candidate[1]) >= minimumDistance)) {
      points.push(candidate);
    }
  }
  return points;
}

function gridLayout(count: number): Array<[number, number]> {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const gap = Math.min(0.22, 0.7 / Math.max(columns - 1, rows - 1, 1));
  return Array.from({ length: count }, (_, index) => [
    (index % columns - (columns - 1) / 2) * gap,
    (Math.floor(index / columns) - (rows - 1) / 2) * gap,
  ] as [number, number]);
}

export function pipLayout(
  value: string,
  random = false,
  seed = 1,
  faceIndex = 0,
): Array<[number, number]> {
  const count = Math.max(0, Math.min(20, Number.parseInt(value, 10) || 0));
  if (!count) return [];
  if (random) return randomLayout(count, seed + faceIndex * 104729);
  return PIP_LAYOUTS[count] || gridLayout(count);
}

export function createMarkTexture(
  value: string,
  style: MarkStyle,
  graphicData: string,
  patternScale: number,
  randomPips: boolean,
  pipSeed: number,
  faceIndex: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const ink = "#171915";

  const drawText = () => {
    context.clearRect(0, 0, 384, 384);
    context.fillStyle = ink;
    context.shadowColor = "rgba(255,255,255,.42)";
    context.shadowBlur = 3;
    context.shadowOffsetY = 4;
    const length = value.length;
    const baseSize = length > 2 ? 150 : length === 2 ? 190 : 230;
    context.font = `800 ${baseSize * patternScale}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(value, 192, 200);
  };

  const layout = pipLayout(value, randomPips, pipSeed, faceIndex);
  if (style === "pips" && layout.length) {
    context.clearRect(0, 0, 384, 384);
    context.fillStyle = ink;
    const dotRadius = Math.max(10, Math.min(31, 31 * patternScale / Math.max(1, Math.sqrt(layout.length / 6))));
    layout.forEach(([x, y]) => {
      context.beginPath();
      context.arc(192 + x * 270 * patternScale, 192 + y * 270 * patternScale, dotRadius, 0, Math.PI * 2);
      context.fill();
    });
  } else if (style === "graphic" && graphicData) {
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, 384, 384);
      const imageSize = 276 * patternScale;
      const origin = (384 - imageSize) / 2;
      context.save();
      context.filter = "grayscale(1) contrast(8)";
      context.drawImage(image, origin, origin, imageSize, imageSize);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = ink;
      context.fillRect(0, 0, 384, 384);
      context.restore();
      texture.needsUpdate = true;
    };
    image.src = graphicData;
  } else {
    drawText();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
