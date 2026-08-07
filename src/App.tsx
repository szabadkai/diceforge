import { ChangeEvent, useMemo, useState } from "react";
import DiceScene from "./DiceScene";
import { getDieFaceFrames } from "./diceGeometry";
import { buildDiceStl, saveBlob } from "./stlExport";
import type { DiceConfig, DieSides, DistributionPreset, MarkStyle } from "./types";
import "./styles.css";

const DIE_OPTIONS: DieSides[] = [6, 8, 10, 12, 20];
const COLORS = ["#f2eee4", "#ff6433", "#b8f247", "#7ba9ff", "#272a25"];
const FORM_NOW_URL = "https://now.formlabs.com/";

function standardValues(sides: DieSides) {
  if (sides === 10) return Array.from({ length: 10 }, (_, index) => String(index));
  return Array.from({ length: sides }, (_, index) => String(index + 1));
}

function oppositeValues(sides: DieSides) {
  const frames = getDieFaceFrames(sides, 24);
  const result = Array.from({ length: sides }, () => "");
  const available = new Set(frames.map((_, index) => index));
  let low = sides === 10 ? 0 : 1;
  let high = sides === 10 ? 9 : sides;
  while (available.size) {
    const first = available.values().next().value as number;
    available.delete(first);
    const opposite = [...available].sort(
      (a, b) => frames[first].normal.dot(frames[a].normal) - frames[first].normal.dot(frames[b].normal),
    )[0];
    result[first] = String(low);
    if (opposite !== undefined) {
      result[opposite] = String(high);
      available.delete(opposite);
    }
    low += 1;
    high -= 1;
  }
  return result;
}

function shuffleValues(sides: DieSides) {
  const result = standardValues(sides);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export default function App() {
  const [config, setConfig] = useState<DiceConfig>({
    sides: 20,
    size: 24,
    edge: 1.2,
    sphereCut: true,
    sphereCutAmount: 0.55,
    depth: 0.65,
    patternScale: 0.9,
    markStyle: "numbers",
    randomPips: false,
    pipSeed: 2026,
    values: standardValues(20),
    color: COLORS[0],
    graphicName: "",
    graphicData: "",
  });
  const [preset, setPreset] = useState<DistributionPreset | "custom">("standard");
  const [exportState, setExportState] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [showFaces, setShowFaces] = useState(false);

  const estimatedVolume = useMemo(() => {
    const factor = { 6: 0.93, 8: 0.49, 10: 0.48, 12: 0.64, 20: 0.43 }[config.sides];
    return Math.round(config.size ** 3 * factor / 100) / 10;
  }, [config.size, config.sides]);

  const selectSides = (sides: DieSides) => {
    setConfig((current) => ({
      ...current,
      sides,
      values: standardValues(sides),
      randomPips: false,
    }));
    setPreset("standard");
    setExportState("idle");
  };

  const applyPreset = (nextPreset: DistributionPreset) => {
    const randomPipLayout = nextPreset === "random" && config.markStyle === "pips";
    const values = nextPreset === "standard"
      ? standardValues(config.sides)
      : nextPreset === "opposites"
        ? oppositeValues(config.sides)
        : nextPreset === "random"
          ? randomPipLayout ? config.values : shuffleValues(config.sides)
          : Array.from({ length: config.sides }, () => "");
    setConfig((current) => ({
      ...current,
      values,
      randomPips: randomPipLayout,
      pipSeed: randomPipLayout ? Math.floor(Math.random() * 2_000_000_000) : current.pipSeed,
    }));
    setPreset(nextPreset);
    setExportState("idle");
  };

  const updateValue = (index: number, value: string) => {
    setConfig((current) => {
      const values = [...current.values];
      values[index] = value.slice(0, 3);
      return { ...current, values };
    });
    setPreset("custom");
    setExportState("idle");
  };

  const uploadGraphic = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConfig((current) => ({
        ...current,
        markStyle: "graphic",
        graphicName: file.name,
        graphicData: String(reader.result),
      }));
      setExportState("idle");
    };
    reader.readAsDataURL(file);
  };

  const exportModel = async (printAfter = false) => {
    if (config.markStyle === "graphic" && !config.graphicData) {
      document.getElementById("graphic-upload")?.click();
      return;
    }
    setExportState("building");
    const formWindow = printAfter ? window.open("about:blank", "_blank") : null;
    try {
      const blob = await buildDiceStl(config);
      saveBlob(blob, `diceforge-d${config.sides}-${config.size}mm.stl`);
      setExportState("ready");
      if (formWindow) formWindow.location.href = FORM_NOW_URL;
      else if (printAfter) window.location.assign(FORM_NOW_URL);
    } catch (error) {
      console.error(error);
      formWindow?.close();
      setExportState("error");
    }
  };

  const setMarkStyle = (markStyle: MarkStyle) => {
    setConfig((current) => ({ ...current, markStyle, randomPips: false }));
    setPreset("custom");
    setExportState("idle");
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="DiceForge home">
          <span className="brand-glyph" aria-hidden="true"><i /><i /><i /></span>
          <span>DICEFORGE</span>
        </a>
        <div className="header-note"><span /> BROWSER-BASED / NO SIGN-IN</div>
        <a className="ghost-link" href="#about">HOW IT WORKS <span>↘</span></a>
      </header>

      <section className="intro" id="top">
        <div className="eyebrow"><span>PRECISION DICE STUDIO</span><span>V1.0</span></div>
        <h1>MAKE CHANCE<br /><em>TANGIBLE.</em></h1>
        <p>Build a one-of-one polyhedral die, tune every face, and export a production-ready STL—right here in your browser.</p>
        <div className="scroll-cue">START FORGING <span>↓</span></div>
      </section>

      <section className="forge-shell" aria-label="Dice model generator">
        <div className="steps" aria-label="Generator steps">
          <span className="active">01 / BODY</span>
          <span>02 / FACES</span>
          <span>03 / EXPORT</span>
        </div>

        <div className="config-panel">
          <div className="control-section">
            <div className="section-heading"><span>01</span><div><h2>Choose your solid</h2><p>Five balanced polyhedra, sized for real-world play.</p></div></div>
            <div className="die-options" role="group" aria-label="Die type">
              {DIE_OPTIONS.map((sides) => (
                <button
                  type="button"
                  key={sides}
                  className={config.sides === sides ? "selected" : ""}
                  onClick={() => selectSides(sides)}
                  aria-pressed={config.sides === sides}
                >
                  <span className={`die-icon die-icon-${sides}`}>{sides}</span>
                  <b>D{sides}</b>
                </button>
              ))}
            </div>

            <label className="range-row">
              <span><b>Overall size</b><small>Largest dimension</small></span>
              <input type="range" min="12" max="32" step="1" value={config.size} onChange={(event) => {
                const size = Number(event.target.value);
                setConfig({ ...config, size, edge: Math.min(config.edge, size * 0.21) });
              }} />
              <output>{config.size}<small>mm</small></output>
            </label>
            <label className="range-row">
              <span><b>Edge radius</b><small>Softer rolls</small></span>
              <input type="range" min="0.2" max={Math.min(4.8, config.size * 0.21)} step="0.1" value={config.edge} onChange={(event) => setConfig({ ...config, edge: Number(event.target.value) })} />
              <output>{config.edge.toFixed(1)}<small>mm</small></output>
            </label>

            {config.sides === 6 && (
              <>
                <div className="toggle-row">
                  <span><b>Sphere corner cut</b><small>BOOLEAN INTERSECTION · D6 ONLY</small></span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.sphereCut}
                    className={config.sphereCut ? "active" : ""}
                    onClick={() => {
                      setConfig({ ...config, sphereCut: !config.sphereCut });
                      setExportState("idle");
                    }}
                  ><i /></button>
                </div>
                {config.sphereCut && (
                  <label className="range-row sphere-cut-strength">
                    <span><b>Corner cut</b><small>Sphere intersection depth</small></span>
                    <input type="range" min="0.12" max="1.38" step="0.02" value={config.sphereCutAmount} onChange={(event) => setConfig({ ...config, sphereCutAmount: Number(event.target.value) })} />
                    <output>{Math.round(config.sphereCutAmount * 100)}<small>%</small></output>
                  </label>
                )}
              </>
            )}

            <div className="color-row">
              <span><b>Preview resin</b><small>Visual only</small></span>
              <div className="swatches">
                {COLORS.map((color) => <button key={color} type="button" style={{ backgroundColor: color }} className={config.color === color ? "selected" : ""} aria-label={`Use ${color} preview color`} onClick={() => setConfig({ ...config, color })} />)}
              </div>
            </div>
          </div>

          <div className="control-section faces-section">
            <div className="section-heading"><span>02</span><div><h2>Make every face yours</h2><p>Marks are cut into the printable model—not painted on.</p></div></div>
            <div className="segmented" role="group" aria-label="Face mark style">
              {(["numbers", "pips", "graphic"] as MarkStyle[]).map((style) => (
                <button key={style} type="button" className={config.markStyle === style ? "selected" : ""} onClick={() => setMarkStyle(style)} aria-pressed={config.markStyle === style}>
                  {style === "graphic" ? "CUSTOM SVG" : style.toUpperCase()}
                </button>
              ))}
            </div>

            {config.markStyle === "graphic" && (
              <label className="upload-box" htmlFor="graphic-upload">
                <input id="graphic-upload" type="file" accept="image/svg+xml,.svg" onChange={uploadGraphic} />
                <span className="upload-icon">＋</span>
                <span><b>{config.graphicName || "Upload your mark"}</b><small>SVG artwork · solid paths work best</small></span>
                <em>{config.graphicData ? "REPLACE" : "BROWSE"}</em>
              </label>
            )}

            <div className="preset-label"><b>Distribution</b><small>Quick layouts or edit each face</small></div>
            <div className="preset-row">
              {(["standard", "opposites", "random", "blank"] as DistributionPreset[]).map((option) => (
                <button key={option} type="button" className={preset === option ? "selected" : ""} onClick={() => applyPreset(option)}>
                  {option === "random" ? config.markStyle === "pips" ? "random pips" : "shuffle" : option}
                </button>
              ))}
            </div>

            <button className="face-editor-toggle" type="button" onClick={() => setShowFaces(!showFaces)} aria-expanded={showFaces}>
              <span>EDIT {config.sides} FACE VALUES</span><span>{showFaces ? "−" : "+"}</span>
            </button>
            {showFaces && (
              <div className="face-grid">
                {config.values.map((value, index) => (
                  <label key={index}><span>F{String(index + 1).padStart(2, "0")}</span><input aria-label={`Face ${index + 1} value`} value={value} onChange={(event) => updateValue(index, event.target.value)} /></label>
                ))}
              </div>
            )}

            <label className="range-row depth-row">
              <span><b>Pattern size</b><small>Scale every face mark</small></span>
              <input type="range" min="0.5" max="1.8" step="0.05" value={config.patternScale} onChange={(event) => setConfig({ ...config, patternScale: Number(event.target.value) })} />
              <output>{Math.round(config.patternScale * 100)}<small>%</small></output>
            </label>

            <label className="range-row">
              <span><b>Deboss depth</b><small>Recommended 0.4–0.8 mm</small></span>
              <input type="range" min="0.3" max="1.2" step="0.05" value={config.depth} onChange={(event) => setConfig({ ...config, depth: Number(event.target.value) })} />
              <output>{config.depth.toFixed(2)}<small>mm</small></output>
            </label>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-topline"><span>LIVE MODEL / D{config.sides}</span><span className="live-dot">● LIVE</span></div>
          <div className="canvas-wrap"><DiceScene config={config} /></div>
          <div className="orbit-note"><span>↻</span> DRAG TO ORBIT · SCROLL TO ZOOM</div>
          <div className="quick-export">
            {exportState === "ready" && <span className="quick-export-status">STL DOWNLOADED ✓</span>}
            {exportState === "error" && <span className="quick-export-status error">EXPORT FAILED — TRY AGAIN</span>}
            <button type="button" onClick={() => exportModel(false)} disabled={exportState === "building"}>
              <span>
                <b>{exportState === "building" ? "BUILDING STL…" : "EXPORT MODEL"}</b>
                <small>D{config.sides} · {config.size} MM · BINARY STL</small>
              </span>
              <span aria-hidden="true">↓</span>
            </button>
          </div>
          <div className="model-stats">
            <div><span>SIZE</span><b>{config.size} mm</b></div>
            <div><span>FACES</span><b>{config.sides}</b></div>
            <div><span>EST. VOLUME</span><b>{estimatedVolume} cm³</b></div>
            <div><span>FORMAT</span><b>STL / MM</b></div>
          </div>
        </div>

        <div className="export-panel" id="export">
          <div className="export-copy">
            <span className="export-number">03</span>
            <div><h2>Ready to roll?</h2><p>Your model is generated locally. Nothing is uploaded until you choose a printer.</p></div>
          </div>
          {exportState === "error" && <p className="error-note" role="alert">The model could not be built. Try a simpler SVG or switch to numbers.</p>}
          <div className="export-actions">
            <button type="button" className="download-button" onClick={() => exportModel(false)} disabled={exportState === "building"}>
              <span>{exportState === "building" ? "BUILDING MODEL…" : exportState === "ready" ? "DOWNLOAD AGAIN" : "DOWNLOAD STL"}</span><span>↓</span>
            </button>
            <button type="button" className="print-button" onClick={() => exportModel(true)} disabled={exportState === "building"}>
              <span><b>PRINT WITH FORM NOW</b><small>Downloads STL + opens instant quote</small></span><span>↗</span>
            </button>
          </div>
        </div>
      </section>

      <section className="how" id="about">
        <span className="vertical-label">WHY DICEFORGE</span>
        <div><span>01</span><h3>Private by default.</h3><p>The entire model is built on your device. Your art stays yours.</p></div>
        <div><span>02</span><h3>Made for resin.</h3><p>Millimeter units and controllable recesses tuned for crisp SLA detail.</p></div>
        <div><span>03</span><h3>From idea to object.</h3><p>Export your STL or move straight into a professional Form Now quote.</p></div>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-glyph"><i /><i /><i /></span><span>DICEFORGE</span></a><p>MAKE CHANCE TANGIBLE.</p><span>© 2026 · BUILT FOR MAKERS</span></footer>
    </main>
  );
}
