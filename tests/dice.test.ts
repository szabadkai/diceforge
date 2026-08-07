import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { createDieGeometry, getFaceFrames } from "../src/diceGeometry";
import { buildDiceStl } from "../src/stlExport";
import type { DiceConfig, DieSides } from "../src/types";

globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  callback(0);
  return 0;
}) as typeof requestAnimationFrame;
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

for (const sides of [6, 8, 10, 12, 20] as DieSides[]) {
  test(`D${sides} has ${sides} usable faces`, () => {
    const geometry = createDieGeometry(sides, 24, 1.2);
    const frames = getFaceFrames(geometry);
    assert.equal(frames.length, sides);
    assert.ok(frames.every((frame) => frame.radius > 1));
    geometry.dispose();
  });
}

test("exports a binary STL with debossed pips", async () => {
  const config: DiceConfig = {
    sides: 6,
    size: 18,
    edge: 1,
    depth: 0.55,
    markStyle: "pips",
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
    depth: 0.55,
    markStyle: "graphic",
    values: Array.from({ length: 8 }, (_, index) => String(index + 1)),
    color: "#ffffff",
    graphicName: "mark.svg",
    graphicData: `data:image/svg+xml;base64,${btoa(svg)}`,
  };
  const stl = await buildDiceStl(config);
  assert.ok(stl.size > 10_000);
});
