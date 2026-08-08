import * as THREE from "three";
import { patternFillScale } from "./diceGeometry";
import { getCanvasFont } from "./fontCatalog";
import type { FontId, MarkStyle } from "./types";

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
  font: FontId,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const ink = "#171915";
  const fill = patternFillScale(patternScale);

  const drawRecessedText = (text: string, x: number, y: number) => {
    context.fillStyle = "rgba(255,255,255,.48)";
    context.fillText(text, x - 2.2, y - 2.2);
    context.fillStyle = "rgba(0,0,0,.72)";
    context.fillText(text, x + 3, y + 3.5);
    context.fillStyle = ink;
    context.fillText(text, x, y);
  };

  const drawRecessedDot = (x: number, y: number, radius: number) => {
    [[-2, -2, "rgba(255,255,255,.5)"], [3, 3.5, "rgba(0,0,0,.72)"], [0, 0, ink]].forEach(
      ([offsetX, offsetY, color]) => {
        context.beginPath();
        context.arc(x + Number(offsetX), y + Number(offsetY), radius, 0, Math.PI * 2);
        context.fillStyle = String(color);
        context.fill();
      },
    );
  };

  const drawText = () => {
    context.clearRect(0, 0, 384, 384);
    context.textAlign = "center";
    context.textBaseline = "middle";
    let fontSize = 280;
    context.font = `800 ${fontSize}px ${getCanvasFont(font)}`;
    const measured = context.measureText(value || " ");
    const measuredHeight = Math.max(1, measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent);
    const maxWidth = 320 * fill;
    const maxHeight = 270 * fill;
    fontSize *= Math.min(maxWidth / Math.max(1, measured.width), maxHeight / measuredHeight, 1);
    context.font = `800 ${fontSize}px ${getCanvasFont(font)}`;
    drawRecessedText(value, 192, 198);
  };

  const layout = pipLayout(value, randomPips, pipSeed, faceIndex);
  if (style === "pips" && layout.length) {
    context.clearRect(0, 0, 384, 384);
    const dotRadius = Math.max(8, Math.min(25, 25 * fill / Math.max(1, Math.sqrt(layout.length / 6))));
    layout.forEach(([x, y]) => {
      drawRecessedDot(192 + x * 346 * fill, 192 + y * 346 * fill, dotRadius);
    });
  } else if (style === "graphic" && graphicData) {
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, 384, 384);
      const target = 320 * fill;
      const imageScale = Math.min(target / Math.max(1, image.naturalWidth), target / Math.max(1, image.naturalHeight));
      const width = image.naturalWidth * imageScale;
      const height = image.naturalHeight * imageScale;
      const mask = document.createElement("canvas");
      mask.width = 384;
      mask.height = 384;
      const maskContext = mask.getContext("2d")!;
      maskContext.filter = "grayscale(1) contrast(8)";
      maskContext.drawImage(image, (384 - width) / 2, (384 - height) / 2, width, height);
      const drawTint = (offsetX: number, offsetY: number, color: string) => {
        const layer = document.createElement("canvas");
        layer.width = 384;
        layer.height = 384;
        const layerContext = layer.getContext("2d")!;
        layerContext.drawImage(mask, offsetX, offsetY);
        layerContext.globalCompositeOperation = "source-in";
        layerContext.fillStyle = color;
        layerContext.fillRect(0, 0, 384, 384);
        context.drawImage(layer, 0, 0);
      };
      drawTint(-2.2, -2.2, "rgba(255,255,255,.48)");
      drawTint(3, 3.5, "rgba(0,0,0,.72)");
      drawTint(0, 0, ink);
      texture.needsUpdate = true;
    };
    image.src = graphicData;
  } else {
    drawText();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
