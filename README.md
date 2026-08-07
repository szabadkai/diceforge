# DiceForge

DiceForge is a browser-based, print-ready polyhedral dice generator. It creates D6, D8, D10, D12, and D20 models with numbers, pips, or an uploaded SVG mark, custom face distributions, adjustable dimensions, and true debossed geometry in the exported STL.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

Push the project to a GitHub repository on the `main` branch. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow builds and publishes the site on every push to `main`.

## Printing handoff

The “Print with Form Now” action downloads the STL locally, then opens the Formlabs Form Now uploader. Browsers do not allow a website to silently upload a local model to another service, so the user selects the freshly downloaded STL on Form Now to receive a quote.
