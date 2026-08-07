export type DieSides = 6 | 8 | 10 | 12 | 20;
export type MarkStyle = "numbers" | "pips" | "graphic";
export type DistributionPreset = "standard" | "opposites" | "random" | "blank";

export interface DiceConfig {
  sides: DieSides;
  size: number;
  edge: number;
  depth: number;
  patternScale: number;
  markStyle: MarkStyle;
  randomPips: boolean;
  pipSeed: number;
  values: string[];
  color: string;
  graphicName: string;
  graphicData: string;
}
