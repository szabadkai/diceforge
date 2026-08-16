# DiceForge

DiceForge is a browser-based, print-ready polyhedral dice generator. It creates D6, D8, D10, D12, and D20 models with numbers, regular or randomized spherical pips, custom text, or SVG marks. SVG mode includes fifteen pickable collections with 90 print-safe marks—spanning platforming, fabrication, Japanese motifs, fantasy, nature, nautical, spooky, cyberpunk, food, animals, dinosaurs, and elemental themes—plus custom set uploads. Number and text marks support sixteen free, printable font choices, a shared label or per-face labels, adjustable face-pattern scaling, and true debossed geometry in the exported STL. Text mode also includes twenty curated 20-label sets—covering oracles, stories, tabletop play, creativity, moods, social prompts, and practical decision makers—ranked so each supported die uses an increasingly rich prefix of the same set. Pip diameter and depth are independently adjustable: matching radius and depth produces a hemisphere, while wider openings produce shallow spherical caps with no cylindrical walls, flat bottoms, or undercuts. Patterns are fitted against each die's real face polygon so maximum-scale marks remain printable. Every solid supports dense, smooth adjustable edge fillets, and the D6 also includes an independently adjustable high-resolution sphere-boolean corner cut. The viewer parses and lights the generated binary STL itself, and the download action saves that same in-memory file.

Printable booleans are resolved with the Manifold geometry engine. Export tests parse the generated binary STL and reject open edges, zero-area triangles, inverted volume, and other non-manifold topology across every supported die type. They also compare every preview vertex against the exported STL so the two cannot drift apart.

Current control ranges reach 4.8 mm for edge radius, 138% for the D6 sphere cut, and 180% for face-pattern scale (with geometry-aware limits on smaller solids).

Optional blade-supported exports automatically orient every die tip-down, add strong fins beneath only the spoke edges born at the first printed tip, and join them to low-profile rail feet. Three contact profiles are available: straight uses a conventional continuous blade edge, staggered keeps the edge continuous while shifting it from side to side, and dotted interrupts only the thin interface into short 0.9 mm blade segments about 2.4 mm apart. Dotted contacts remain flat blade sections rather than round posts. Every style has an exposed 0.2 mm neck one-sixth of the selected structural width, ranging from 0.05 mm at the thinnest 0.3 mm setting to 0.2 mm at 1.2 mm. A narrow straight central column supports the first tip with a spherical contact whose intersection diameter matches that breakaway width. Supported STLs are rotated Z-up and placed directly on Z=0 for slicer import; the unsupported export remains available by leaving the toggle off.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

Push the project to a GitHub repository on the `main` branch. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow builds and publishes the site on every push to `main`.

## Printing handoff

The “Print with Form Now” action downloads the STL locally, then shows a persistent handoff panel with a link to the Formlabs Form Now uploader. Browsers do not allow a website to silently upload a local model to another service, so the user explicitly opens Form Now and selects the freshly downloaded STL to receive a quote.
