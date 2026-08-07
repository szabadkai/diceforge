import type { FontId } from "./types";

export const FONT_OPTIONS: Array<{
  id: FontId;
  label: string;
  canvasFamily: string;
}> = [
  { id: "helvetiker-bold", label: "Helvetiker Bold", canvasFamily: '"Arial Black", Arial, sans-serif' },
  { id: "helvetiker-regular", label: "Helvetiker Regular", canvasFamily: "Arial, Helvetica, sans-serif" },
  { id: "optimer-bold", label: "Optimer Bold", canvasFamily: '"Trebuchet MS", Arial, sans-serif' },
  { id: "gentilis-bold", label: "Gentilis Bold", canvasFamily: "Georgia, serif" },
  { id: "droid-sans-bold", label: "Droid Sans Bold", canvasFamily: "Arial, sans-serif" },
  { id: "droid-serif-bold", label: "Droid Serif Bold", canvasFamily: "Georgia, serif" },
  { id: "droid-mono", label: "Droid Mono", canvasFamily: '"Courier New", monospace' },
];

export function getCanvasFont(id: FontId) {
  return FONT_OPTIONS.find((option) => option.id === id)?.canvasFamily || FONT_OPTIONS[0].canvasFamily;
}
