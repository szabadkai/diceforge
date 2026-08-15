import * as THREE from "three";
import { patternFillScale } from "./diceGeometry";
import type { FaceFrame } from "./diceGeometry";
import { getCanvasFont, getCanvasFontWeight } from "./fontCatalog";
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
  // Random layouts are built from mirrored pairs (plus a center pip for odd
  // counts). This keeps their centroid exactly on the center of the face, so
  // the decorative randomness cannot add a lateral weight bias.
  const points: Array<[number, number]> = count % 2 ? [[0, 0]] : [];
  const minimumDistance = count <= 6 ? 0.2 : count <= 10 ? 0.145 : 0.105;
  let attempts = 0;
  while (points.length < count && attempts < 1200) {
    attempts += 1;
    const angle = random() * Math.PI * 2;
    const radius = 0.12 + random() * 0.33;
    const candidate: [number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    const mirror: [number, number] = [-candidate[0], -candidate[1]];
    if ([candidate, mirror].every((point) => points.every(
      ([x, y]) => Math.hypot(x - point[0], y - point[1]) >= minimumDistance,
    ))) {
      points.push(candidate, mirror);
    }
  }
  return points.slice(0, count);
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

function polygonContains(point: [number, number], polygon: THREE.Vector2[], clearance = 0) {
  return polygon.every((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const edgeX = end.x - start.x;
    const edgeY = end.y - start.y;
    const length = Math.hypot(edgeX, edgeY);
    if (length < 0.000001) return true;
    const originSide = edgeX * -start.y - edgeY * -start.x;
    const pointSide = edgeX * (point[1] - start.y) - edgeY * (point[0] - start.x);
    return (originSide < 0 ? -pointSide : pointSide) / length >= clearance - 0.000001;
  });
}

function halton(index: number, base: number) {
  let fraction = 1;
  let result = 0;
  let value = index;
  while (value > 0) {
    fraction /= base;
    result += fraction * (value % base);
    value = Math.floor(value / base);
  }
  return result;
}

function shapeCandidates(polygon: THREE.Vector2[], random?: () => number) {
  const minX = Math.min(...polygon.map((point) => point.x));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const minY = Math.min(...polygon.map((point) => point.y));
  const maxY = Math.max(...polygon.map((point) => point.y));
  const candidates: Array<[number, number]> = [[0, 0]];

  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    candidates.push([point.x, point.y]);
    for (const amount of [0.25, 0.5, 0.75]) {
      candidates.push([
        THREE.MathUtils.lerp(point.x, next.x, amount),
        THREE.MathUtils.lerp(point.y, next.y, amount),
      ]);
    }
  });

  for (let index = 1; candidates.length < 620 && index < 5000; index += 1) {
    const xAmount = random ? random() : halton(index, 2);
    const yAmount = random ? random() : halton(index, 3);
    const candidate: [number, number] = [
      THREE.MathUtils.lerp(minX, maxX, xAmount),
      THREE.MathUtils.lerp(minY, maxY, yAmount),
    ];
    if (polygonContains(candidate, polygon)) candidates.push(candidate);
  }
  return candidates;
}

function minimumPointDistance(points: Array<[number, number]>) {
  let result = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => points.slice(0, index).forEach((other) => {
    result = Math.min(result, Math.hypot(point[0] - other[0], point[1] - other[1]));
  }));
  return result;
}

function scaleCenteredPoints(
  source: Array<[number, number]>,
  polygon: THREE.Vector2[],
  fill: number,
  clearance: number,
  minimumSpacing: number,
) {
  const meanX = source.reduce((sum, point) => sum + point[0], 0) / source.length;
  const meanY = source.reduce((sum, point) => sum + point[1], 0) / source.length;
  const centered = source.map((point) => [point[0] - meanX, point[1] - meanY] as [number, number]);

  let low = 0;
  let high = 1;
  while (centered.every((point) => polygonContains([point[0] * high, point[1] * high], polygon, clearance))) {
    high *= 1.5;
    if (high > 64) break;
  }
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const middle = (low + high) * 0.5;
    if (centered.every((point) => polygonContains([point[0] * middle, point[1] * middle], polygon, clearance))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  const sourceSpacing = minimumPointDistance(centered);
  const collisionFreeScale = Number.isFinite(sourceSpacing) && sourceSpacing > 0
    ? minimumSpacing / sourceSpacing
    : 0;
  const scale = Math.min(low, Math.max(low * fill, collisionFreeScale));
  return centered.map((point) => [point[0] * scale, point[1] * scale] as [number, number]);
}

function spreadAcrossPolygon(
  count: number,
  polygon: THREE.Vector2[],
  fill: number,
  clearance: number,
  minimumSpacing: number,
  random?: () => number,
) {
  if (count === 1) return [[0, 0] as [number, number]];
  const candidates = shapeCandidates(polygon, random);
  const points: Array<[number, number]> = [];
  const first = random ? candidates[Math.floor(random() * candidates.length)] : candidates[0];
  points.push(first);

  while (points.length < count) {
    let best = candidates[0];
    let bestDistance = -1;
    candidates.forEach((candidate) => {
      const distance = Math.min(...points.map(
        (point) => (candidate[0] - point[0]) ** 2 + (candidate[1] - point[1]) ** 2,
      ));
      if (distance > bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    });
    points.push(best);
  }

  return scaleCenteredPoints(points, polygon, fill, clearance, minimumSpacing);
}

export function facePipLayout(
  value: string,
  frame: FaceFrame,
  patternScale: number,
  pipDiameter: number,
  random = false,
  seed = 1,
  faceIndex = 0,
  classicSquare = false,
): Array<[number, number]> {
  const count = Math.max(0, Math.min(20, Number.parseInt(value, 10) || 0));
  if (!count) return [];
  const fill = patternFillScale(patternScale);
  const clearance = Math.min(pipDiameter * 0.5 + 0.15, frame.inradius * 0.82);
  const minimumSpacing = pipDiameter + Math.max(0.12, pipDiameter * 0.08);
  if (classicSquare) {
    return scaleCenteredPoints(
      pipLayout(value, random, seed, faceIndex),
      frame.polygon,
      fill,
      clearance,
      minimumSpacing,
    );
  }
  const source = random ? randomSource(seed + faceIndex * 104729) : undefined;
  return spreadAcrossPolygon(count, frame.polygon, fill, clearance, minimumSpacing, source);
}

export function balancePipValues(
  values: string[],
  frames: FaceFrame[],
  radialInset = 0,
  seed = 1,
) {
  const source = randomSource(seed);
  const facePoints = frames.map((frame) => frame.center.clone().addScaledVector(frame.normal, -radialInset));
  const weight = (value: string) => Math.max(0, Math.min(20, Number.parseInt(value, 10) || 0));
  const score = (assignment: string[]) => assignment.reduce(
    (moment, value, index) => moment.addScaledVector(facePoints[index], weight(value)),
    new THREE.Vector3(),
  ).lengthSq();
  let best = values.slice(0, frames.length);
  let bestScore = score(best);

  for (let restart = 0; restart < 48; restart += 1) {
    const candidate = values.slice(0, frames.length);
    for (let index = candidate.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(source() * (index + 1));
      [candidate[index], candidate[swap]] = [candidate[swap], candidate[index]];
    }
    let candidateScore = score(candidate);
    for (let improvement = 0; improvement < 30; improvement += 1) {
      let nextScore = candidateScore;
      let nextSwap: [number, number] | undefined;
      for (let first = 0; first < candidate.length; first += 1) {
        for (let second = first + 1; second < candidate.length; second += 1) {
          [candidate[first], candidate[second]] = [candidate[second], candidate[first]];
          const swappedScore = score(candidate);
          [candidate[first], candidate[second]] = [candidate[second], candidate[first]];
          if (swappedScore < nextScore - 0.000000001) {
            nextScore = swappedScore;
            nextSwap = [first, second];
          }
        }
      }
      if (!nextSwap) break;
      [candidate[nextSwap[0]], candidate[nextSwap[1]]] = [candidate[nextSwap[1]], candidate[nextSwap[0]]];
      candidateScore = nextScore;
    }
    if (candidateScore < bestScore) {
      best = [...candidate];
      bestScore = candidateScore;
    }
  }
  return best;
}

function projectPointToPolygon(
  point: [number, number],
  polygon: THREE.Vector2[],
  clearance: number,
) {
  const result: [number, number] = [...point];
  for (let pass = 0; pass < 16; pass += 1) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      const edgeX = end.x - start.x;
      const edgeY = end.y - start.y;
      const length = Math.hypot(edgeX, edgeY);
      if (length < 0.000001) return;
      const originSide = edgeX * -start.y - edgeY * -start.x;
      const inwardX = (originSide < 0 ? edgeY : -edgeY) / length;
      const inwardY = (originSide < 0 ? -edgeX : edgeX) / length;
      const distance = inwardX * (result[0] - start.x) + inwardY * (result[1] - start.y);
      if (distance < clearance) {
        result[0] += inwardX * (clearance - distance);
        result[1] += inwardY * (clearance - distance);
      }
    });
  }
  return result;
}

export function dicePipLayouts(
  values: string[],
  frames: FaceFrame[],
  patternScale: number,
  pipDiameter: number,
  random = false,
  seed = 1,
  classicSquare = false,
  radialInset = 0,
) {
  if (!random) {
    return frames.map((frame, faceIndex) => facePipLayout(
      values[faceIndex], frame, patternScale, pipDiameter, false, seed, faceIndex, classicSquare,
    ));
  }

  const fill = patternFillScale(patternScale);
  const layouts = frames.map((frame, faceIndex) => {
    const count = Math.max(0, Math.min(20, Number.parseInt(values[faceIndex], 10) || 0));
    if (!count) return [];
    const clearance = Math.min(pipDiameter * 0.5 + 0.15, frame.inradius * 0.82);
    // Leave some travel around the scattered layout. The global solver uses
    // that room to balance all pip removals without making each face symmetric.
    return spreadAcrossPolygon(
      count,
      frame.polygon,
      fill * 0.96,
      clearance,
      pipDiameter + Math.max(0.12, pipDiameter * 0.08),
      randomSource(seed + faceIndex * 104729),
    );
  });
  const residual = () => layouts.reduce((moment, layout, faceIndex) => {
    const frame = frames[faceIndex];
    const facePoint = frame.center.clone().addScaledVector(frame.normal, -radialInset);
    layout.forEach(([x, y]) => moment
      .add(facePoint)
      .addScaledVector(frame.tangent, x)
      .addScaledVector(frame.bitangent, y));
    return moment;
  }, new THREE.Vector3());

  for (let iteration = 0; iteration < 480; iteration += 1) {
    const error = residual();
    if (error.lengthSq() < 0.0000000001) break;
    const projected = new THREE.Vector3();
    layouts.forEach((layout, faceIndex) => {
      if (!layout.length) return;
      const normal = frames[faceIndex].normal;
      projected.addScaledVector(
        error.clone().addScaledVector(normal, -error.dot(normal)),
        layout.length,
      );
    });
    const denominator = projected.lengthSq();
    if (denominator < 0.000000000001) break;
    const step = error.dot(projected) / denominator;
    layouts.forEach((layout, faceIndex) => {
      if (!layout.length) return;
      const frame = frames[faceIndex];
      const clearance = Math.min(pipDiameter * 0.5 + 0.15, frame.inradius * 0.82);
      const shiftX = step * frame.tangent.dot(error);
      const shiftY = step * frame.bitangent.dot(error);
      layout.forEach((point, pointIndex) => {
        layout[pointIndex] = projectPointToPolygon(
          [point[0] - shiftX, point[1] - shiftY], frame.polygon, clearance,
        );
      });
    });
  }

  return layouts;
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
  const canvasFont = getCanvasFont(font);
  const canvasFontWeight = getCanvasFontWeight(font);

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
    context.font = `${canvasFontWeight} ${fontSize}px ${canvasFont}`;
    const measured = context.measureText(value || " ");
    const measuredHeight = Math.max(1, measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent);
    const maxWidth = 320 * fill;
    const maxHeight = 270 * fill;
    fontSize *= Math.min(maxWidth / Math.max(1, measured.width), maxHeight / measuredHeight, 1);
    context.font = `${canvasFontWeight} ${fontSize}px ${canvasFont}`;
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
  if ((style === "numbers" || style === "text") && document.fonts) {
    document.fonts.load(`${canvasFontWeight} 64px ${canvasFont}`).then(() => {
      drawText();
      texture.needsUpdate = true;
    }).catch(() => undefined);
  }
  return texture;
}
