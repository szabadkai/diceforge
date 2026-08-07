# DiceForge

DiceForge is a browser-based, print-ready polyhedral dice generator. It creates D6, D8, D10, D12, and D20 models with numbers, regular or randomized pips, custom text, or an uploaded SVG mark. Number and text marks support seven printable font choices, a shared label or per-face labels, adjustable face-pattern scaling, and true debossed geometry in the exported STL. Every solid supports adjustable edge fillets, and the D6 also includes an independently adjustable sphere-boolean corner cut.

Current control ranges reach 4.8 mm for edge radius, 138% for the D6 sphere cut, and 180% for face-pattern scale (with geometry-aware limits on smaller solids).

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

Push the project to a GitHub repository on the `main` branch. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow builds and publishes the site on every push to `main`.

## Printing handoff

The “Print with Form Now” action downloads the STL locally, then opens the Formlabs Form Now uploader. Browsers do not allow a website to silently upload a local model to another service, so the user selects the freshly downloaded STL on Form Now to receive a quote.
