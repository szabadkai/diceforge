import type { DiceConfig } from "./types";

export function printableConfigKey(config: DiceConfig) {
  return JSON.stringify([
    config.sides,
    config.size,
    config.edge,
    config.sphereCut,
    config.sphereCutAmount,
    config.depth,
    config.pipSize,
    config.patternScale,
    config.markStyle,
    config.font,
    config.randomPips,
    config.pipSeed,
    config.values,
    config.graphicData,
  ]);
}
