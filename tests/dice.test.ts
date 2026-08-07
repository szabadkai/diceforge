import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { createDieGeometry, getDieFaceFrames } from "../src/diceGeometry";
import { pipLayout } from "../src/markTexture";
import { buildDiceStl } from "../src/stlExport";
import type { DiceConfig, DieSides } from "../src/types";

globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  callback(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
  test(`D${sides} has ${sides} usable faces`, () => {
    const frames = getDieFaceFrames(sides, 24);
    assert.equal(frames.length, sides);
    assert.ok(frames.every((frame) => frame.radius > 1));
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

test("exports a binary STL with debossed pips", async () => {
  const config: DiceConfig = {
    sides: 6,
    size: 18,
    edge: 1,
    sphereCut: true,
    sphereCutAmount: 0.55,
    depth: 0.55,
    patternScale: 0.9,
    markStyle: "pips",
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
    randomPips: false,
    pipSeed: 42,
    values: Array.from({ length: 8 }, (_, index) => String(index + 1)),
    color: "#ffffff",
    graphicName: "mark.svg",
    graphicData: `data:image/svg+xml;base64,${btoa(svg)}`,
  };
  const stl = await buildDiceStl(config);
  assert.ok(stl.size > 10_000);
});
