export type DieSides = 6 | 8 | 10 | 12 | 20;
export type MarkStyle = "numbers" | "pips" | "text" | "graphic";
export type DistributionPreset = "standard" | "opposites" | "random" | "blank";
export type FontId =
  | "helvetiker-bold"
  | "helvetiker-regular"
  | "optimer-bold"
  | "optimer-regular"
  | "gentilis-bold"
  | "gentilis-regular"
  | "droid-sans-bold"
  | "droid-sans-regular"
  | "droid-serif-bold"
  | "droid-serif-regular"
  | "droid-mono"
  | "bungee"
  | "orbitron-bold"
  | "oswald-bold"
  | "cinzel-bold"
  | "space-mono-bold";

export interface DiceConfig {
  sides: DieSides;
  size: number;
  edge: number;
  sphereCut: boolean;
  sphereCutAmount: number;
  depth: number;
  pipSize: number;
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
  graphicSetId?: string;
  graphicDataSet?: string[];
  graphicNames?: string[];
}
