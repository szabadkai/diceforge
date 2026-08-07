export type DieSides = 6 | 8 | 10 | 12 | 20;
export type MarkStyle = "numbers" | "pips" | "text" | "graphic";
export type DistributionPreset = "standard" | "opposites" | "random" | "blank";
export type FontId =
  | "helvetiker-bold"
  | "helvetiker-regular"
  | "optimer-bold"
  | "gentilis-bold"
  | "droid-sans-bold"
  | "droid-serif-bold"
  | "droid-mono";

export interface DiceConfig {
  sides: DieSides;
  size: number;
  edge: number;
  sphereCut: boolean;
  sphereCutAmount: number;
  depth: number;
  patternScale: number;
  markStyle: MarkStyle;
  font: FontId;
  faceText: string;
  randomPips: boolean;
  pipSeed: number;
  values: string[];
  color: string;
  graphicName: string;
  graphicData: string;
}
