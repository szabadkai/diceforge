import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import bungeeJson from "@compai/font-bungee/data/typefaces/normal-400.json";
import cinzelBoldJson from "@compai/font-cinzel/data/typefaces/normal-700.json";
import orbitronBoldJson from "@compai/font-orbitron/data/typefaces/normal-700.json";
import oswaldBoldJson from "@compai/font-oswald/data/typefaces/normal-700.json";
import spaceMonoBoldJson from "@compai/font-space-mono/data/typefaces/normal-700.json";
import droidMonoJson from "three/examples/fonts/droid/droid_sans_mono_regular.typeface.json";
import droidSansJson from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import droidSansRegularJson from "three/examples/fonts/droid/droid_sans_regular.typeface.json";
import droidSerifJson from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import droidSerifRegularJson from "three/examples/fonts/droid/droid_serif_regular.typeface.json";
import gentilisJson from "three/examples/fonts/gentilis_bold.typeface.json";
import gentilisRegularJson from "three/examples/fonts/gentilis_regular.typeface.json";
import helvetikerBoldJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import helvetikerRegularJson from "three/examples/fonts/helvetiker_regular.typeface.json";
import optimerJson from "three/examples/fonts/optimer_bold.typeface.json";
import optimerRegularJson from "three/examples/fonts/optimer_regular.typeface.json";
import type { FontId } from "./types";

const loader = new FontLoader();
const parseFont = (data: unknown) => loader.parse(data as Parameters<typeof loader.parse>[0]);
const fonts = {
  "helvetiker-bold": loader.parse(helvetikerBoldJson),
  "helvetiker-regular": loader.parse(helvetikerRegularJson),
  "optimer-bold": loader.parse(optimerJson),
  "optimer-regular": loader.parse(optimerRegularJson),
  "gentilis-bold": loader.parse(gentilisJson),
  "gentilis-regular": loader.parse(gentilisRegularJson),
  "droid-sans-bold": loader.parse(droidSansJson),
  "droid-sans-regular": loader.parse(droidSansRegularJson),
  "droid-serif-bold": loader.parse(droidSerifJson),
  "droid-serif-regular": loader.parse(droidSerifRegularJson),
  "droid-mono": loader.parse(droidMonoJson),
  "bungee": parseFont(bungeeJson),
  "orbitron-bold": parseFont(orbitronBoldJson),
  "oswald-bold": parseFont(oswaldBoldJson),
  "cinzel-bold": parseFont(cinzelBoldJson),
  "space-mono-bold": parseFont(spaceMonoBoldJson),
};

export function getFont(id: FontId) {
  return fonts[id];
}
