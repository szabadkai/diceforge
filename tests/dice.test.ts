import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import {
  createDieGeometry,
  fitCenteredRectangle,
  getDieFaceFrames,
  patternFillScale,
} from "../src/diceGeometry";
import { FONT_OPTIONS } from "../src/fontCatalog";
import { pipLayout } from "../src/markTexture";
import { printableConfigKey } from "../src/modelConfig";
import { createHemisphericalPipCutter, hemisphericalPipRadius } from "../src/pipGeometry";
import { getFont } from "../src/stlFonts";
import { buildDiceStl, parseDiceStl } from "../src/stlExport";
import type { DiceConfig, DieSides } from "../src/types";

globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  callback(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

async function auditBinaryStl(stl: Blob) {
  const view = new DataView(await stl.arrayBuffer());
  const triangleCount = view.getUint32(80, true);
  const edges = new Map<string, number>();
  let signedVolume = 0;
  let degenerateTriangles = 0;
  const key = (point: number[]) => point.map((value) => Math.round(value * 100_000)).join(",");

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = 84 + triangle * 50;
    const points = [0, 1, 2].map((corner) => [
      view.getFloat32(offset + 12 + corner * 12, true),
      view.getFloat32(offset + 16 + corner * 12, true),
      view.getFloat32(offset + 20 + corner * 12, true),
    ]);
    const [a, b, c] = points;
    const ab = b.map((value, axis) => value - a[axis]);
    const ac = c.map((value, axis) => value - a[axis]);
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    if (Math.hypot(...cross) < 0.000000000001) degenerateTriangles += 1;
    signedVolume += (
      a[0] * (b[1] * c[2] - b[2] * c[1])
      + a[1] * (b[2] * c[0] - b[0] * c[2])
      + a[2] * (b[0] * c[1] - b[1] * c[0])
    ) / 6;

    [[a, b], [b, c], [c, a]].forEach(([start, end]) => {
      const startKey = key(start);
      const endKey = key(end);
      const edgeKey = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
      edges.set(edgeKey, (edges.get(edgeKey) || 0) + 1);
    });
  }

  return {
    triangleCount,
    signedVolume,
    degenerateTriangles,
    nonManifoldEdges: [...edges.values()].filter((uses) => uses !== 2).length,
  };
}

async function assertWatertight(stl: Blob, label = "STL") {
  const audit = await auditBinaryStl(stl);
  assert.ok(audit.triangleCount > 0);
  assert.ok(audit.signedVolume > 0, `${label} triangle winding must produce a positive enclosed volume`);
  assert.equal(audit.degenerateTriangles, 0, `${label} must not contain zero-area triangles`);
  assert.equal(audit.nonManifoldEdges, 0, `${label} must share every edge between exactly two triangles`);
}

async function assertPreviewUsesExactStl(stl: Blob) {
  const view = new DataView(await stl.arrayBuffer());
  const triangleCount = view.getUint32(80, true);
  const geometry = await parseDiceStl(stl);
  const position = geometry.getAttribute("position");
  assert.equal(position.count, triangleCount * 3, "preview must contain every exported STL triangle");

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const stlOffset = 84 + triangle * 50 + 12;
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = triangle * 3 + corner;
      assert.equal(position.getX(vertex), view.getFloat32(stlOffset + corner * 12, true));
      assert.equal(position.getY(vertex), view.getFloat32(stlOffset + corner * 12 + 4, true));
      assert.equal(position.getZ(vertex), view.getFloat32(stlOffset + corner * 12 + 8, true));
    }
  }
  geometry.dispose();
}

for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
  test(`D${sides} has ${sides} usable faces`, () => {
    const frames = getDieFaceFrames(sides, 24);
    assert.equal(frames.length, sides);
    assert.ok(frames.every((frame) => frame.radius > 1 && frame.inradius > 1 && frame.polygon.length >= 3));
  });

  test(`D${sides} edge radius changes its printable body`, () => {
    const subtle = createDieGeometry(sides, 24, 0.3);
    const round = createDieGeometry(sides, 24, 1.8);
    const subtlePosition = subtle.getAttribute("position");
    const roundPosition = round.getAttribute("position");
    const magnitude = (position: typeof subtlePosition) => {
      let total = 0;
      for (let index = 0; index < position.count; index += 1) {
        total += position.getX(index) ** 2 + position.getY(index) ** 2 + position.getZ(index) ** 2;
      }
      return total;
    };
    const subtleMagnitude = magnitude(subtlePosition);
    const roundMagnitude = magnitude(roundPosition);
    assert.notEqual(roundMagnitude, subtleMagnitude);
    subtle.dispose();
    round.dispose();
  });
}

test("fillets use a dense printable mesh", () => {
  const geometry = createDieGeometry(6, 24, 1.2);
  assert.ok(geometry.getAttribute("position").count > 1_000);
  geometry.dispose();
});

test("maximum-size marks fit inside every unique face polygon", () => {
  for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
    getDieFaceFrames(sides, 24).forEach((frame) => {
      const width = 2;
      const height = 1;
      const scale = fitCenteredRectangle(frame, width, height) * patternFillScale(1.8);
      frame.polygon.forEach((point, index) => {
        const next = frame.polygon[(index + 1) % frame.polygon.length];
        const edge = next.clone().sub(point);
        const normal = edge.clone().set(-edge.y, edge.x).normalize();
        const edgeDistance = Math.abs(normal.dot(point));
        const markSupport = (Math.abs(normal.x) * width + Math.abs(normal.y) * height) * scale * 0.5;
        assert.ok(markSupport <= edgeDistance + 0.0001);
      });
    });
  }
});

test("random pip layouts are seeded, irregular, and keep the requested count", () => {
  const regular = pipLayout("6");
  const first = pipLayout("6", true, 42, 0);
  const repeat = pipLayout("6", true, 42, 0);
  const nextFace = pipLayout("6", true, 42, 1);
  assert.equal(first.length, 6);
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, regular);
  assert.notDeepEqual(first, nextFace);
});

test("pip cutters are true spheres centered on the face plane", () => {
  const radius = hemisphericalPipRadius(12, 0.8, 6, 0.65);
  assert.equal(radius, 0.65, "pip depth must equal the hemisphere radius");
  const cutter = createHemisphericalPipCutter(radius);
  const position = cutter.getAttribute("position");
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    assert.ok(Math.abs(Math.hypot(
      position.getX(vertex),
      position.getY(vertex),
      position.getZ(vertex),
    ) - radius) < 0.000001);
  }
  cutter.dispose();
});

test("every font picker option creates printable outlines", () => {
  assert.equal(FONT_OPTIONS.length, 16);
  FONT_OPTIONS.forEach(({ id }) => {
    assert.ok(getFont(id).generateShapes("88", 10).length > 0, `${id} should contain printable number outlines`);
  });
});

test("preview cache tracks printable settings but ignores preview color", () => {
  const config: DiceConfig = {
    sides: 6,
    size: 24,
    edge: 1.2,
    sphereCut: true,
    sphereCutAmount: 0.55,
    depth: 0.65,
    patternScale: 1,
    markStyle: "numbers",
    font: "helvetiker-bold",
    faceText: "LUCKY",
    randomPips: false,
    pipSeed: 42,
    values: ["1", "2", "3", "4", "5", "6"],
    color: "#ffffff",
    graphicName: "",
    graphicData: "",
  };
  assert.equal(printableConfigKey(config), printableConfigKey({ ...config, color: "#ff6433" }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, patternScale: 1.05 }));
});

test("D6 sphere boolean cuts the rounded cube corners", () => {
  const filleted = createDieGeometry(6, 24, 1.2, false, 0.55);
  const sphereCut = createDieGeometry(6, 24, 1.2, true, 0.55);
  assert.notEqual(
    filleted.getAttribute("position").count,
    sphereCut.getAttribute("position").count,
  );
  filleted.dispose();
  sphereCut.dispose();
});

test("exports a binary STL with debossed pips at maximum control ranges", async () => {
  const config: DiceConfig = {
    sides: 6,
    size: 18,
    edge: 4.8,
    sphereCut: true,
    sphereCutAmount: 1.38,
    depth: 0.55,
    patternScale: 1.8,
    markStyle: "pips",
    font: "helvetiker-bold",
    faceText: "LUCKY",
    randomPips: true,
    pipSeed: 42,
    values: ["1", "2", "3", "4", "5", "6"],
    color: "#ffffff",
    graphicName: "",
    graphicData: "",
  };
  const stl = await buildDiceStl(config);
  assert.equal(stl.type, "model/stl");
  assert.ok(stl.size > 100_000);
  await assertWatertight(stl);
});

test("turns uploaded SVG paths into debossed geometry", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5L95 95H5Z"/></svg>';
  const config: DiceConfig = {
    sides: 8,
    size: 20,
    edge: 1,
    sphereCut: false,
    sphereCutAmount: 0.55,
    depth: 0.55,
    patternScale: 1.1,
    markStyle: "graphic",
    font: "helvetiker-bold",
    faceText: "LUCKY",
    randomPips: false,
    pipSeed: 42,
    values: Array.from({ length: 8 }, (_, index) => String(index + 1)),
    color: "#ffffff",
    graphicName: "mark.svg",
    graphicData: `data:image/svg+xml;base64,${btoa(svg)}`,
  };
  const stl = await buildDiceStl(config);
  assert.ok(stl.size > 10_000);
  await assertWatertight(stl);
});

test("exports custom face text with a selected printable font", async () => {
  const config: DiceConfig = {
    sides: 8,
    size: 22,
    edge: 1.4,
    sphereCut: false,
    sphereCutAmount: 0.55,
    depth: 0.6,
    patternScale: 1,
    markStyle: "text",
    font: "gentilis-bold",
    faceText: "LUCKY",
    randomPips: false,
    pipSeed: 9,
    values: Array.from({ length: 8 }, () => "LUCKY"),
    color: "#ffffff",
    graphicName: "",
    graphicData: "",
  };
  const stl = await buildDiceStl(config);
  assert.ok(stl.size > 10_000);
  await assertWatertight(stl);
});

test("exports a watertight numbered STL for every die type", async () => {
  for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
    const config: DiceConfig = {
      sides,
      size: 24,
      edge: 1.2,
      sphereCut: sides === 6,
      sphereCutAmount: 0.55,
      depth: 0.65,
      patternScale: 1.8,
      markStyle: "numbers",
      font: "orbitron-bold",
      faceText: "LUCKY",
      randomPips: false,
      pipSeed: 42,
      values: Array.from({ length: sides }, (_, index) => String(index + 1)),
      color: "#ffffff",
      graphicName: "",
      graphicData: "",
    };
    const stl = await buildDiceStl(config);
    await assertWatertight(stl, `D${sides} numbered STL`);
    await assertPreviewUsesExactStl(stl);
  }
});

test("exports watertight hemispherical pips for every die type", async () => {
  for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
    const config: DiceConfig = {
      sides,
      size: 24,
      edge: 1.2,
      sphereCut: sides === 6,
      sphereCutAmount: 0.55,
      depth: 0.65,
      patternScale: 1.2,
      markStyle: "pips",
      font: "helvetiker-bold",
      faceText: "LUCKY",
      randomPips: false,
      pipSeed: 42,
      values: Array.from({ length: sides }, (_, index) => String(sides === 10 ? index : index + 1)),
      color: "#ffffff",
      graphicName: "",
      graphicData: "",
    };
    const stl = await buildDiceStl(config);
    await assertWatertight(stl, `D${sides} pip STL`);
    await assertPreviewUsesExactStl(stl);
  }
});
