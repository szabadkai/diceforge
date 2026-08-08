import type { FontId } from "./types";

export const FONT_OPTIONS: Array<{
  id: FontId;
  label: string;
  canvasFamily: string;
  canvasWeight: number;
}> = [
  { id: "helvetiker-bold", label: "Helvetiker Bold", canvasFamily: '"Arial Black", Arial, sans-serif', canvasWeight: 800 },
  { id: "helvetiker-regular", label: "Helvetiker Regular", canvasFamily: "Arial, Helvetica, sans-serif", canvasWeight: 400 },
  { id: "optimer-bold", label: "Optimer Bold", canvasFamily: '"Trebuchet MS", Arial, sans-serif', canvasWeight: 700 },
  { id: "optimer-regular", label: "Optimer Regular", canvasFamily: '"Trebuchet MS", Arial, sans-serif', canvasWeight: 400 },
  { id: "gentilis-bold", label: "Gentilis Bold", canvasFamily: "Georgia, serif", canvasWeight: 700 },
  { id: "gentilis-regular", label: "Gentilis Regular", canvasFamily: "Georgia, serif", canvasWeight: 400 },
  { id: "droid-sans-bold", label: "Droid Sans Bold", canvasFamily: "Arial, sans-serif", canvasWeight: 700 },
  { id: "droid-sans-regular", label: "Droid Sans Regular", canvasFamily: "Arial, sans-serif", canvasWeight: 400 },
  { id: "droid-serif-bold", label: "Droid Serif Bold", canvasFamily: "Georgia, serif", canvasWeight: 700 },
  { id: "droid-serif-regular", label: "Droid Serif Regular", canvasFamily: "Georgia, serif", canvasWeight: 400 },
  { id: "droid-mono", label: "Droid Mono", canvasFamily: '"Courier New", monospace', canvasWeight: 400 },
  { id: "bungee", label: "Bungee", canvasFamily: '"Bungee", sans-serif', canvasWeight: 400 },
  { id: "orbitron-bold", label: "Orbitron Bold", canvasFamily: '"Orbitron", sans-serif', canvasWeight: 700 },
  { id: "oswald-bold", label: "Oswald Bold", canvasFamily: '"Oswald", sans-serif', canvasWeight: 700 },
  { id: "cinzel-bold", label: "Cinzel Bold", canvasFamily: '"Cinzel", serif', canvasWeight: 700 },
  { id: "space-mono-bold", label: "Space Mono Bold", canvasFamily: '"Space Mono", monospace', canvasWeight: 700 },
];

export function getCanvasFont(id: FontId) {
  return FONT_OPTIONS.find((option) => option.id === id)?.canvasFamily || FONT_OPTIONS[0].canvasFamily;
}

export function getCanvasFontWeight(id: FontId) {
  return FONT_OPTIONS.find((option) => option.id === id)?.canvasWeight || FONT_OPTIONS[0].canvasWeight;
}
