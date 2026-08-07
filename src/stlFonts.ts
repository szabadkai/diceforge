import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import droidMonoJson from "three/examples/fonts/droid/droid_sans_mono_regular.typeface.json";
import droidSansJson from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import droidSerifJson from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import gentilisJson from "three/examples/fonts/gentilis_bold.typeface.json";
import helvetikerBoldJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import helvetikerRegularJson from "three/examples/fonts/helvetiker_regular.typeface.json";
import optimerJson from "three/examples/fonts/optimer_bold.typeface.json";
import type { FontId } from "./types";

const loader = new FontLoader();
const fonts = {
  "helvetiker-bold": loader.parse(helvetikerBoldJson),
  "helvetiker-regular": loader.parse(helvetikerRegularJson),
  "optimer-bold": loader.parse(optimerJson),
  "gentilis-bold": loader.parse(gentilisJson),
  "droid-sans-bold": loader.parse(droidSansJson),
  "droid-serif-bold": loader.parse(droidSerifJson),
  "droid-mono": loader.parse(droidMonoJson),
};

export function getFont(id: FontId) {
  return fonts[id];
}
