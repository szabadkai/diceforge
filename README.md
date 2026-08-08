# DiceForge

DiceForge is a browser-based, print-ready polyhedral dice generator. It creates D6, D8, D10, D12, and D20 models with numbers, regular or randomized hemispherical pips, custom text, or an uploaded SVG mark. Number and text marks support sixteen free, printable font choices, a shared label or per-face labels, adjustable face-pattern scaling, and true debossed geometry in the exported STL. Pip cutters are spheres centered on each face plane, producing curved half-sphere dimples with no cylindrical walls or flat bottoms. Patterns are fitted against each die's real face polygon so maximum-scale marks remain printable. Every solid supports dense, smooth adjustable edge fillets, and the D6 also includes an independently adjustable high-resolution sphere-boolean corner cut. The viewer parses and lights the generated binary STL itself, and the download action saves that same in-memory file.

Printable booleans are resolved with the Manifold geometry engine. Export tests parse the generated binary STL and reject open edges, zero-area triangles, inverted volume, and other non-manifold topology across every supported die type. They also compare every preview vertex against the exported STL so the two cannot drift apart.

Current control ranges reach 4.8 mm for edge radius, 138% for the D6 sphere cut, and 180% for face-pattern scale (with geometry-aware limits on smaller solids).

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

Push the project to a GitHub repository on the `main` branch. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow builds and publishes the site on every push to `main`.

## Printing handoff

The “Print with Form Now” action downloads the STL locally, then shows a persistent handoff panel with a link to the Formlabs Form Now uploader. Browsers do not allow a website to silently upload a local model to another service, so the user explicitly opens Form Now and selects the freshly downloaded STL to receive a quote.
