export interface GraphicTheme {
  id: string;
  name: string;
  caption: string;
  accent: string;
  paper: string;
  marks: string[];
  markNames: string[];
}

const rawMarks = import.meta.glob<string>("./assets/dice-themes/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});

function mark(path: string) {
  const raw = rawMarks[`./assets/dice-themes/${path}.svg`];
  if (!raw) throw new Error(`Missing built-in dice mark: ${path}`);
  const binary = Array.from(new TextEncoder().encode(raw), (byte) => String.fromCharCode(byte)).join("");
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function theme(
  id: string,
  name: string,
  caption: string,
  accent: string,
  paper: string,
  filenames: string[],
): GraphicTheme {
  return {
    id,
    name,
    caption,
    accent,
    paper,
    marks: filenames.map((filename) => mark(`${id}/${filename}`)),
    markNames: filenames,
  };
}

export const GRAPHIC_THEMES: GraphicTheme[] = [
  theme("mushroom-kingdom", "Mushroom Kingdom", "Power-ups · blocks · adventure", "#e33b2f", "#fff0d8", [
    "mario", "bullet-bill", "mushroom", "fire-flower", "question-block", "super-star",
  ]),
  theme("animal-companions", "Animal companions", "Whiskers · paws · cuddles", "#e06f61", "#fff0e8", [
    "cat", "dog", "bear", "mouse", "rabbit", "poodle",
  ]),
  theme("farmyard-friends", "Farmyard friends", "Hooves · feathers · happy hatches", "#d58a35", "#fff3d9", [
    "horse", "pig", "cow", "chicken", "chick", "duck",
  ]),
  theme("wild-world", "Wild world", "Stripes · trunks · big adventures", "#c66c35", "#f8ead9", [
    "fox", "zebra", "kangaroo", "giraffe", "elephant", "tiger",
  ]),
  theme("treetop-friends", "Treetop friends", "Wings · tails · woodland hellos", "#66924c", "#eaf3df", [
    "monkey", "squirrel", "hedgehog", "bird", "owl", "parrot",
  ]),
  theme("water-world", "Water world", "Ponds · rivers · ocean splashes", "#338fa8", "#e1f3f4", [
    "frog", "snake", "crocodile", "snail", "turtle", "fish",
  ]),
  theme("ocean-explorers", "Ocean explorers", "Flippers · fins · wiggly arms", "#347fbd", "#e5f0fa", [
    "seal", "penguin", "dolphin", "shrimp", "crab", "octopus",
  ]),
  theme("tiny-creatures", "Tiny creatures", "Shells · spots · busy little legs", "#9b6e3c", "#f5eddb", [
    "caterpillar", "ladybug", "bee", "butterfly", "ant", "spider",
  ]),
  theme("things-that-go", "Things that go", "Roads · rails · sky · sea", "#df623e", "#faebe2", [
    "car", "bus", "train", "airplane", "ship", "truck",
  ]),
  theme("yummy-fruit", "Yummy fruit", "Crunchy · juicy · sweet", "#e55252", "#fceaea", [
    "apple", "banana", "strawberry", "watermelon", "orange", "pear",
  ]),
  theme("playtime", "Playtime", "Bounce · build · imagine", "#8b6ac8", "#f0eafa", [
    "ball", "teddy-bear", "kite", "balloon", "puzzle-piece", "bicycle",
  ]),
  theme("weather-and-sky", "Weather & sky", "Sunshine · rainbows · bedtime stars", "#4d8fc5", "#e7f2fa", [
    "sun", "cloud", "rainbow", "snowflake", "moon", "star",
  ]),
  theme("feelings", "Feelings", "Happy · sad · silly · sleepy", "#d96a98", "#fae9f1", [
    "happy", "sad", "wink", "sleepy", "surprised", "silly",
  ]),
  theme("hungary-budapest", "Hungary & Budapest", "Parliament · tricolor · Danube charm", "#ce2939", "#eef5e9", [
    "hungarian-flag", "parliament", "chain-bridge", "fishermans-bastion", "buda-castle",
    "heroes-square", "thermal-bath", "tram", "holy-crown", "hungary-map", "paprika", "goulash",
    "puzzle-cube", "langos", "grey-cattle", "balaton", "folk-tulip", "csikos", "kolbasz", "tokaji-grapes",
  ]),
  theme("formlabs", "Formlabs", "Official Form 4 sample-part art", "#ff6a13", "#f4f2ec", [
    "butterfly", "game-controller", "led-light-bar", "robotic-finger", "tower-cap", "connector",
  ]),
  theme("japanese", "Japanese motifs", "Tradition · nature · craft", "#d84a3a", "#fbf1e5", [
    "torii", "mount-fuji", "sakura", "koi", "folding-fan", "daruma",
  ]),
  theme("starfall", "Starfall", "Orbit · omen · eclipse", "#7ba9ff", "#e9efff", [
    "sun", "moon", "star", "planet", "comet", "eye",
  ]),
  theme("witchs-pantry", "Witch's pantry", "Brews · familiars · charms", "#9e6bde", "#f0e9f8", [
    "potion", "cat", "candle", "mushroom", "key", "crystal",
  ]),
  theme("dungeon-delve", "Dungeon delve", "Steel · treasure · danger", "#ff6433", "#fae9e2", [
    "sword", "shield", "skull", "key", "chest", "torch",
  ]),
  theme("wildwood", "Wildwood", "Leaves · spores · small magic", "#5f9544", "#e9f2df", [
    "leaf", "acorn", "flower", "pine", "mushroom", "moth",
  ]),
  theme("high-seas", "High seas", "Salt · storms · strange tides", "#3a97a8", "#e0f1f2", [
    "anchor", "fish", "wave", "shell", "tentacle", "lighthouse",
  ]),
  theme("tiny-chaos", "Tiny chaos", "Cute things · bad decisions", "#e65386", "#fae8ef", [
    "duck", "ghost", "frog", "crown", "lightning", "heart",
  ]),
  theme("neon-circuit", "Neon circuit", "Chrome · code · midnight", "#25a99a", "#e2f7f2", [
    "chip", "robot", "antenna", "visor", "drone", "glitch-heart",
  ]),
  theme("fright-night", "Fright night", "Bats · shadows · old houses", "#7258a5", "#eee9f7", [
    "bat", "coffin", "spider", "pumpkin", "haunted-house", "raven",
  ]),
  theme("snack-attack", "Snack attack", "Treats · caffeine · crumbs", "#ed8a31", "#fff0df", [
    "pizza", "cupcake", "taco", "coffee", "popsicle", "ramen",
  ]),
  theme("critter-crew", "Critter crew", "Paws · wings · tiny friends", "#b97547", "#f5eadf", [
    "fox", "bunny", "bear", "paw", "owl", "bee",
  ]),
  theme("dino-days", "Dino days", "Fossils · ferns · big stomps", "#779a39", "#edf3df", [
    "trex", "footprint", "egg", "bone", "volcano", "fern",
  ]),
  theme("primal-elements", "Primal elements", "Flame · tide · stone · storm", "#db4e39", "#f9e7df", [
    "flame", "drop", "mountain", "wind", "snowflake", "earth",
  ]),
];

const animalLibraryThemeIds = new Set([
  "animal-companions",
  "farmyard-friends",
  "wild-world",
  "treetop-friends",
  "water-world",
  "ocean-explorers",
  "tiny-creatures",
]);
const animalLibraryThemes = GRAPHIC_THEMES.filter((item) => animalLibraryThemeIds.has(item.id));
GRAPHIC_THEMES.splice(1, 0, {
  id: "animal-library",
  name: "All animal friends",
  caption: "Choose any animals · make your own set",
  accent: "#4d9259",
  paper: "#eaf4e5",
  marks: animalLibraryThemes.flatMap((item) => item.marks),
  markNames: animalLibraryThemes.flatMap((item) => item.markNames),
});

export const DEFAULT_GRAPHIC_THEME = GRAPHIC_THEMES[0];

export function getGraphicTheme(id?: string) {
  return GRAPHIC_THEMES.find((item) => item.id === id);
}
