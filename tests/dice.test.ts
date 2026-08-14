import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { Vector3 } from "three";
import {
  createDieGeometry,
  fitCenteredRectangle,
  getDieFaceFrames,
  patternFillScale,
} from "../src/diceGeometry";
import { FONT_OPTIONS } from "../src/fontCatalog";
import { fillFaceSet, removeGraphicAssignments, setFaceRotation, swapFaceAssignments } from "../src/graphicSet";
import { pipLayout } from "../src/markTexture";
import { printableConfigKey } from "../src/modelConfig";
import { createSphericalPipCutter, sphericalPipDimensions } from "../src/pipGeometry";
import { getFont } from "../src/stlFonts";
import { splitFaceWords, TEXT_PRESETS, textPresetValues, textWordValues } from "../src/textPresets";
import { buildDiceStl, parseDiceStl } from "../src/stlExport";
import {
  BLADE_SUPPORT_CONTACT_EDGE_INSET,
  BLADE_SUPPORT_CONTACT_NECK,
  BLADE_SUPPORT_CONTACT_SPACING,
  BLADE_SUPPORT_DOTTED_SEGMENT_LENGTH,
  bladeSupportContactWidth,
  bladeSupportHubRadii,
} from "../src/bladeSupports";
import type { BladeSupportContactStyle, DiceConfig, DieSides } from "../src/types";

globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  callback(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

test("custom SVG sets cycle in file order to fill every face", () => {
  assert.deepEqual(fillFaceSet(["leaf", "moon", "duck"], 8), [
    "leaf", "moon", "duck", "leaf", "moon", "duck", "leaf", "moon",
  ]);
  assert.deepEqual(fillFaceSet([], 6), []);
});

test("custom SVG face assignments swap after expanding the active die", () => {
  assert.deepEqual(swapFaceAssignments(["leaf", "moon", "duck"], 0, 4, 6), [
    "moon", "moon", "duck", "leaf", "leaf", "duck",
  ]);
});

test("custom SVG rotations support the full degree range and follow face swaps", () => {
  const rotated = setFaceRotation([0, 90], 2, 273, 6);
  assert.deepEqual(rotated, [0, 90, 273, 90, 0, 90]);
  assert.deepEqual(swapFaceAssignments(rotated, 2, 4, 6), [0, 90, 0, 90, 273, 90]);
  assert.equal(setFaceRotation([], 0, 361, 1)[0], 360);
});

test("removing a custom SVG also removes its aligned name and rotation", () => {
  assert.deepEqual(
    removeGraphicAssignments(
      ["leaf", "moon", "leaf", "duck"],
      ["leaf.svg", "moon.svg", "leaf.svg", "duck.svg"],
      [15, 90, 210, 330],
      "leaf",
    ),
    {
      graphics: ["moon", "duck"],
      names: ["moon.svg", "duck.svg"],
      rotations: [90, 330],
    },
  );
});

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

test("pip diameter and depth produce printable spherical caps", () => {
  const hemisphere = sphericalPipDimensions(1.3, 0.65);
  assert.deepEqual(hemisphere, {
    openingRadius: 0.65,
    depth: 0.65,
    sphereRadius: 0.65,
    centerOffset: 0,
  });
  const wideCap = sphericalPipDimensions(2, 0.4);
  assert.equal(wideCap.openingRadius, 1);
  assert.equal(wideCap.depth, 0.4);
  assert.ok(Math.abs(wideCap.sphereRadius - 1.45) < 0.000001);
  assert.ok(Math.abs(wideCap.centerOffset - 1.05) < 0.000001);

  const cutter = createSphericalPipCutter(wideCap.sphereRadius);
  const position = cutter.getAttribute("position");
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    assert.ok(Math.abs(Math.hypot(
      position.getX(vertex),
      position.getY(vertex),
      position.getZ(vertex),
    ) - wideCap.sphereRadius) < 0.000001);
  }
  cutter.dispose();
});

test("pip diameter follows the requested physical size across the full control range", () => {
  for (const diameter of [0.6, 1.3, 3, 4.5, 6]) {
    const dimensions = sphericalPipDimensions(diameter, 0.3);
    assert.equal(dimensions.openingRadius * 2, diameter);
  }
});

test("every font picker option creates printable outlines", () => {
  assert.equal(FONT_OPTIONS.length, 16);
  FONT_OPTIONS.forEach(({ id }) => {
    assert.ok(getFont(id).generateShapes("88", 10).length > 0, `${id} should contain printable number outlines`);
  });
});

test("curated text sets scale to every supported die", () => {
  assert.ok(TEXT_PRESETS.length >= 20);
  TEXT_PRESETS.forEach((preset) => {
    assert.equal(preset.values.length, 20, `${preset.id} must fill a D20`);
    assert.equal(new Set(preset.values).size, 20, `${preset.id} values must be unique`);
    assert.ok(preset.values.every((value) => value.length <= 12), `${preset.id} labels must fit the text limit`);
    for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
      assert.deepEqual(textPresetValues(preset.id, sides), preset.values.slice(0, sides));
    }
  });
});

test("custom word lists map one whitespace-separated word to each face", () => {
  assert.deepEqual(splitFaceWords("  YES  no\nMAYBE\tEXTRAORDINARILY  "), ["YES", "no", "MAYBE", "EXTRAORDINAR"]);
  assert.deepEqual(textWordValues("one two three", 6), ["one", "two", "three", "", "", ""]);
  assert.deepEqual(textWordValues("one two three four five six seven", 6), ["one", "two", "three", "four", "five", "six"]);
});

test("preview cache tracks printable settings but ignores preview color", () => {
  const config: DiceConfig = {
    sides: 6,
    size: 24,
    edge: 1.2,
    sphereCut: true,
    sphereCutAmount: 0.55,
    depth: 0.65,
    pipSize: 1.3,
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
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, pipSize: 1.5 }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, graphicDataSet: ["theme-mark"] }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, graphicRotations: [90] }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, bladeSupports: true }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, bladeSupportWidth: 0.8 }));
  assert.notEqual(printableConfigKey(config), printableConfigKey({ ...config, bladeSupportContactStyle: "dotted" }));
});

test("all blade contact styles orient every die onto a watertight Z=0 support base", async () => {
  for (const contactStyle of ["straight", "staggered", "dotted"] as BladeSupportContactStyle[]) {
    for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
      const config: DiceConfig = {
        sides,
        size: 24,
        edge: 1.2,
        sphereCut: sides === 6,
        sphereCutAmount: 0.55,
        depth: 0.65,
        pipSize: 1.3,
        patternScale: 0.9,
        markStyle: "numbers",
        font: "helvetiker-bold",
        faceText: "",
        randomPips: false,
        pipSeed: 42,
        values: Array.from({ length: sides }, () => ""),
        color: "#ffffff",
        graphicName: "",
        graphicData: "",
        bladeSupports: true,
        bladeSupportWidth: sides === 20 ? 0.8 : 0.35,
        bladeSupportContactStyle: contactStyle,
      };
      const stl = await buildDiceStl(config);
      await assertWatertight(stl, `D${sides} ${contactStyle} blade-supported STL`);
      const geometry = await parseDiceStl(stl);
      geometry.computeBoundingBox();
      assert.ok(Math.abs(geometry.boundingBox!.min.z) < 0.0001, `D${sides} supports must sit on Z=0`);
      assert.ok(geometry.boundingBox!.max.z > config.size, `D${sides} must be lifted above its support base`);
      const dimensions = geometry.boundingBox!.getSize(new Vector3());
      assert.ok(Math.max(dimensions.x, dimensions.y, dimensions.z) < config.size * 2.2, `D${sides} support layout must remain compact`);
      geometry.dispose();
    }
  }
});

test("blade support contacts are thin, inset, and spaced for clean removal", () => {
  assert.equal(BLADE_SUPPORT_CONTACT_NECK, 0.2);
  assert.equal(BLADE_SUPPORT_CONTACT_SPACING, 2.4);
  assert.equal(BLADE_SUPPORT_CONTACT_EDGE_INSET, 0.7);
  assert.equal(BLADE_SUPPORT_DOTTED_SEGMENT_LENGTH, 0.9);
  assert.equal(bladeSupportContactWidth(0.3), 0.05);
  assert.equal(bladeSupportContactWidth(0.6), 0.1);
  assert.equal(bladeSupportContactWidth(1.2), 0.2);
  assert.deepEqual(bladeSupportHubRadii(0.3), { contact: 0.025, sphere: 0.15, column: 0.108 });
  assert.deepEqual(bladeSupportHubRadii(1.2), { contact: 0.1, sphere: 0.2, column: 0.144 });
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
    pipSize: 6,
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
    pipSize: 1.3,
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
    graphicRotations: [90],
  };
  const stl = await buildDiceStl(config);
  assert.ok(stl.size > 10_000);
  await assertWatertight(stl);
});

test("every built-in SVG mark produces printable D20 geometry", async (context) => {
  const root = new URL("../src/assets/dice-themes/", import.meta.url);
  for (const theme of readdirSync(root)) {
    const themeUrl = new URL(`${theme}/`, root);
    for (const filename of readdirSync(themeUrl).filter((item) => item.endsWith(".svg"))) {
      await context.test(`${theme}/${filename}`, async () => {
        const svg = readFileSync(new URL(filename, themeUrl), "utf8");
        const config: DiceConfig = {
          sides: 20,
          size: 24,
          edge: 1.2,
          sphereCut: false,
          sphereCutAmount: 0.55,
          depth: 0.65,
          pipSize: 1.3,
          patternScale: 0.9,
          markStyle: "graphic",
          font: "helvetiker-bold",
          faceText: "LUCKY",
          randomPips: false,
          pipSeed: 42,
          values: Array.from({ length: 20 }, (_, index) => String(index + 1)),
          color: "#ffffff",
          graphicName: filename,
          graphicData: `data:image/svg+xml;base64,${btoa(svg)}`,
        };
        await assertWatertight(await buildDiceStl(config), `${theme}/${filename}`);
      });
    }
  }
});

test("every built-in SVG collection produces a printable D20", async (context) => {
  const root = new URL("../src/assets/dice-themes/", import.meta.url);
  for (const theme of readdirSync(root)) {
    await context.test(theme, async () => {
      const themeUrl = new URL(`${theme}/`, root);
      const graphicDataSet = readdirSync(themeUrl)
        .filter((item) => item.endsWith(".svg"))
        .map((filename) => `data:image/svg+xml;base64,${btoa(readFileSync(new URL(filename, themeUrl), "utf8"))}`);
      const config: DiceConfig = {
        sides: 20,
        size: 24,
        edge: 1.2,
        sphereCut: false,
        sphereCutAmount: 0.55,
        depth: 0.65,
        pipSize: 1.3,
        patternScale: 0.9,
        markStyle: "graphic",
        font: "helvetiker-bold",
        faceText: "LUCKY",
        randomPips: false,
        pipSeed: 42,
        values: Array.from({ length: 20 }, (_, index) => String(index + 1)),
        color: "#ffffff",
        graphicName: theme,
        graphicData: "",
        graphicDataSet,
      };
      await assertWatertight(await buildDiceStl(config), theme);
    });
  }
});

test("exports custom face text with a selected printable font", async () => {
  const config: DiceConfig = {
    sides: 8,
    size: 22,
    edge: 1.4,
    sphereCut: false,
    sphereCutAmount: 0.55,
    depth: 0.6,
    pipSize: 1.3,
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
      pipSize: 1.3,
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

test("exports watertight configurable spherical pips for every die type", async () => {
  for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
    const config: DiceConfig = {
      sides,
      size: 24,
      edge: 1.2,
      sphereCut: sides === 6,
      sphereCutAmount: 0.55,
      depth: 0.65,
      pipSize: 2.2,
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
