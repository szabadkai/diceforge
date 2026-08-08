export const TEXT_PRESETS = [
  {
    id: "oracle",
    label: "Oracle answers",
    description: "Balanced yes, no, maybe, and timing answers.",
    values: [
      "YES", "NO", "MAYBE", "ASK AGAIN", "GO FOR IT", "NOT NOW",
      "LIKELY", "UNLIKELY", "CERTAIN", "DOUBTFUL", "TRUST IT", "WAIT",
      "SIGNS YES", "RETHINK IT", "VERY LIKELY", "LONG SHOT", "ABSOLUTELY",
      "NO CHANCE", "YOU DECIDE", "SURPRISE",
    ],
  },
  {
    id: "story",
    label: "Story sparks",
    description: "Core story ingredients, followed by richer twists.",
    values: [
      "HERO", "GOAL", "CONFLICT", "VILLAIN", "ALLY", "TWIST",
      "SECRET", "JOURNEY", "DANGER", "DISCOVERY", "RIVAL", "MYSTERY",
      "BETRAYAL", "SACRIFICE", "RESCUE", "TREASURE", "CHASE", "REUNION",
      "PROPHECY", "TRANSFORM",
    ],
  },
  {
    id: "quest",
    label: "Quest generator",
    description: "Playable objectives for tabletop adventures.",
    values: [
      "EXPLORE", "RESCUE", "PROTECT", "RECOVER", "INVESTIGATE", "ESCAPE",
      "NEGOTIATE", "SURVIVE", "TRACK", "DEFEND", "DISCOVER", "DELIVER",
      "INFILTRATE", "SABOTAGE", "RECRUIT", "BARGAIN", "DECEIVE", "ENDURE",
      "COMPETE", "CONFRONT",
    ],
  },
  {
    id: "emotion",
    label: "Character moods",
    description: "Primary emotions first, then expressive blends.",
    values: [
      "JOY", "SADNESS", "ANGER", "FEAR", "SURPRISE", "DISGUST",
      "TRUST", "ANTICIPATION", "LOVE", "OPTIMISM", "AWE", "REMORSE",
      "CONTEMPT", "DELIGHT", "ANXIETY", "CURIOSITY", "ENVY", "PRIDE",
      "RELIEF", "LONGING",
    ],
  },
  {
    id: "genre",
    label: "Genre picker",
    description: "Popular genres first, with niche flavors later.",
    values: [
      "FANTASY", "MYSTERY", "COMEDY", "ROMANCE", "HORROR", "SCI-FI",
      "ADVENTURE", "THRILLER", "DRAMA", "CRIME", "WESTERN", "NOIR",
      "MUSICAL", "HISTORICAL", "WAR", "SPORT", "FAMILY", "SATIRE",
      "DYSTOPIA", "SUPERHERO",
    ],
  },
  {
    id: "dinner",
    label: "Dinner decider",
    description: "Broad crowd-pleasers first, then more variety.",
    values: [
      "PIZZA", "BURGERS", "TACOS", "PASTA", "SUSHI", "CURRY",
      "NOODLES", "BBQ", "SANDWICH", "SOUP", "SEAFOOD", "CHICKEN",
      "VEGGIE", "SALAD", "BREAKFAST", "DUMPLINGS", "KEBAB", "RICE BOWL",
      "STREET FOOD", "SURPRISE",
    ],
  },
  {
    id: "party",
    label: "Party prompts",
    description: "Low-friction icebreakers before bolder challenges.",
    values: [
      "DANCE", "SING", "TELL A JOKE", "MIME", "DRAW", "IMPRESSION",
      "RIDDLE", "CHARADES", "COMPLIMENT", "FUN FACT", "POSE", "RHYME",
      "ACCENT", "HUM A TUNE", "TONGUE TWIST", "TRUTH", "DARE", "SWAP SEATS",
      "GROUP SELFIE", "WILD CARD",
    ],
  },
  {
    id: "reset",
    label: "Quick reset",
    description: "Simple restorative breaks, ordered by accessibility.",
    values: [
      "BREATHE", "STRETCH", "DRINK WATER", "WALK", "REST", "STEP OUTSIDE",
      "MUSIC", "READ", "JOURNAL", "MEDITATE", "TIDY UP", "CREATE",
      "CONNECT", "UNPLUG", "MAKE TEA", "NAP", "SUNLIGHT", "GRATITUDE",
      "PLAN", "DO NOTHING",
    ],
  },
  {
    id: "plot-twist",
    label: "Plot twists",
    description: "High-impact reveals first, stranger turns later.",
    values: [
      "REVEAL", "REVERSAL", "BETRAYAL", "FALSE ALLY", "HIDDEN PAST", "TIME LIMIT",
      "MISTAKEN ID", "SECRET HEIR", "DOUBLE CROSS", "SETUP", "PROPHECY", "MEMORY LOSS",
      "BODY SWAP", "TIME LOOP", "FAKE DEATH", "CURSE", "LOST LETTER", "WRONG TARGET",
      "DREAM", "NEW THREAT",
    ],
  },
  {
    id: "npc-trait",
    label: "NPC personality",
    description: "Readable social traits followed by sharper quirks.",
    values: [
      "FRIENDLY", "GUARDED", "CURIOUS", "NERVOUS", "PROUD", "GREEDY",
      "HONEST", "SECRETIVE", "BRAVE", "COWARDLY", "LOYAL", "RUTHLESS",
      "WITTY", "GLOOMY", "RECKLESS", "PATIENT", "ARROGANT", "KIND",
      "SUSPICIOUS", "ECCENTRIC",
    ],
  },
  {
    id: "encounter",
    label: "Random encounters",
    description: "Flexible meetings first, rare surprises at the end.",
    values: [
      "TRAVELER", "MERCHANT", "LOST CHILD", "BANDITS", "BEAST", "ODD NOISE",
      "PATROL", "AMBUSH", "RIVAL", "REFUGEES", "MESSENGER", "MONSTER",
      "WITCH", "GHOST", "DRAGON", "FESTIVAL", "ROADBLOCK", "WRECKAGE",
      "PORTAL", "OLD FRIEND",
    ],
  },
  {
    id: "magic",
    label: "Magic effects",
    description: "Classic powers first, reality-bending magic later.",
    values: [
      "FIRE", "ICE", "HEALING", "SHIELD", "TELEPORT", "ILLUSION",
      "LIGHTNING", "INVISIBLE", "CHARM", "FLIGHT", "GROW", "SHRINK",
      "SUMMON", "POLYMORPH", "SILENCE", "TIME STOP", "MIND READ", "FORCE PUSH",
      "NECROMANCY", "WILD MAGIC",
    ],
  },
  {
    id: "place",
    label: "Adventure places",
    description: "Familiar terrain first, fantastical realms later.",
    values: [
      "FOREST", "CAVE", "CITY", "VILLAGE", "MOUNTAIN", "COAST",
      "DESERT", "SWAMP", "RUINS", "CASTLE", "TEMPLE", "ISLAND",
      "TUNDRA", "JUNGLE", "UNDERGROUND", "SKY CITY", "VOLCANO", "CANYON",
      "LABYRINTH", "OTHERWORLD",
    ],
  },
  {
    id: "weather",
    label: "Weather maker",
    description: "Everyday conditions first, cinematic events later.",
    values: [
      "CLEAR", "RAIN", "WIND", "SNOW", "FOG", "STORM",
      "HEAT WAVE", "THUNDER", "DRIZZLE", "HAIL", "BLIZZARD", "DOWNPOUR",
      "DUST STORM", "MIST", "HUMID", "FROST", "RAINBOW", "ECLIPSE",
      "METEORS", "ODDLY CALM",
    ],
  },
  {
    id: "date-night",
    label: "Date night",
    description: "Easy plans first, memorable outings later.",
    values: [
      "COFFEE", "WALK", "MOVIE", "DINNER", "HOME COOKING", "GAME NIGHT",
      "PICNIC", "MUSEUM", "LIVE MUSIC", "DESSERT", "BOOKSHOP", "SUNSET",
      "BOWLING", "MINI GOLF", "ROAD TRIP", "STARGAZE", "KARAOKE", "DANCE",
      "DAY TRIP", "SURPRISE",
    ],
  },
  {
    id: "weekend",
    label: "Weekend plans",
    description: "Low-effort favorites first, fresh ideas later.",
    values: [
      "SLEEP IN", "HIKE", "BAKE", "READ", "DAY TRIP", "MOVIE",
      "GAME NIGHT", "GARDEN", "CRAFT", "PICNIC", "BIKE RIDE", "THRIFT SHOP",
      "MUSEUM", "LIVE MUSIC", "COOK", "PHOTO WALK", "VOLUNTEER", "DECLUTTER",
      "CALL FRIEND", "WILD CARD",
    ],
  },
  {
    id: "chores",
    label: "Chore chooser",
    description: "Common essentials first, occasional jobs later.",
    values: [
      "DISHES", "LAUNDRY", "VACUUM", "DUST", "MOP", "BATHROOM",
      "KITCHEN", "TRASH", "RECYCLE", "MAKE BED", "WINDOWS", "GROCERIES",
      "MEAL PREP", "DECLUTTER", "ORGANIZE", "WATER PLANTS", "SWEEP", "FRIDGE",
      "PAPERWORK", "WILD CARD",
    ],
  },
  {
    id: "conversation",
    label: "Conversation topics",
    description: "Easy shared interests first, deeper topics later.",
    values: [
      "DREAMS", "TRAVEL", "MUSIC", "FOOD", "CHILDHOOD", "GOALS",
      "VALUES", "HOBBIES", "BOOKS", "MOVIES", "FRIENDSHIP", "WORK",
      "FAMILY", "NATURE", "FUTURE", "GRATITUDE", "CREATIVITY", "FEARS",
      "CHALLENGES", "WILD CARD",
    ],
  },
  {
    id: "creative",
    label: "Creative boost",
    description: "Practical transformations for breaking idea ruts.",
    values: [
      "SIMPLIFY", "EXAGGERATE", "COMBINE", "REVERSE", "REPEAT", "REMOVE",
      "ZOOM IN", "ZOOM OUT", "REFRAME", "RANDOMIZE", "CONTRAST", "LAYER",
      "DISTORT", "ABSTRACT", "PERSONIFY", "REMIX", "LIMIT", "SWITCH VIEW",
      "BREAK RULES", "START OVER",
    ],
  },
  {
    id: "soundtrack",
    label: "Soundtrack mood",
    description: "Broad musical moods first, vivid tones later.",
    values: [
      "JOYFUL", "CALM", "EPIC", "TENSE", "DREAMY", "DARK",
      "ROMANTIC", "MYSTERIOUS", "PLAYFUL", "NOSTALGIC", "TRIUMPHANT", "MELANCHOLY",
      "CHAOTIC", "HOPEFUL", "OMINOUS", "WHIMSICAL", "FIERCE", "TENDER",
      "SUSPENSE", "OTHERWORLD",
    ],
  },
] as const;

export type TextPresetId = (typeof TEXT_PRESETS)[number]["id"];

export function splitFaceWords(input: string) {
  return input.trim().split(/\s+/u).filter(Boolean).map((word) => word.slice(0, 12));
}

export function textWordValues(input: string, sides: number) {
  const words = splitFaceWords(input);
  return Array.from({ length: sides }, (_, index) => words[index] ?? "");
}

export function textPresetValues(id: TextPresetId, sides: number) {
  const preset = TEXT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown text preset: ${id}`);
  return preset.values.slice(0, sides);
}
