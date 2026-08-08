import { ChangeEvent, DragEvent, KeyboardEvent, useCallback, useMemo, useState } from "react";
import DiceScene from "./DiceScene";
import { getDieFaceFrames } from "./diceGeometry";
import { FONT_OPTIONS } from "./fontCatalog";
import { DEFAULT_GRAPHIC_THEME, GRAPHIC_THEMES } from "./graphicThemes";
import { fillFaceSet, swapFaceAssignments } from "./graphicSet";
import { printableConfigKey } from "./modelConfig";
import { MAX_PIP_DIAMETER } from "./pipGeometry";
import { splitFaceWords, TEXT_PRESETS, textPresetValues, textWordValues } from "./textPresets";
import type { DiceConfig, DieSides, DistributionPreset, FontId, MarkStyle } from "./types";
import type { TextPresetId } from "./textPresets";
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [config, setConfig] = useState<DiceConfig>({
    sides: 20,
    size: 24,
    edge: 1.2,
    sphereCut: true,
    sphereCutAmount: 0.55,
    depth: 0.65,
    pipSize: 1.3,
    patternScale: 0.9,
    markStyle: "numbers",
    font: "helvetiker-bold",
    faceText: "LUCKY",
    randomPips: false,
    pipSeed: 2026,
    values: standardValues(20),
    color: COLORS[0],
    graphicName: "",
    graphicData: "",
    graphicSetId: "",
    graphicDataSet: [],
    graphicNames: [],
  });
  const [preset, setPreset] = useState<DistributionPreset | "custom">("standard");
  const [textPreset, setTextPreset] = useState<TextPresetId | "custom">("custom");
  const [customText, setCustomText] = useState("");
  const [exportState, setExportState] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [previewState, setPreviewState] = useState<"building" | "ready" | "error">("building");
  const [previewModel, setPreviewModel] = useState<{ configKey: string; stl: Blob } | null>(null);
  const [previewErrorKey, setPreviewErrorKey] = useState<string | null>(null);
  const [showFaces, setShowFaces] = useState(false);
  const [showPrintHandoff, setShowPrintHandoff] = useState(false);
  const [graphicUploadState, setGraphicUploadState] = useState<"idle" | "reading" | "error">("idle");
  const [draggedGraphicFace, setDraggedGraphicFace] = useState<number | null>(null);
  const [graphicDropTarget, setGraphicDropTarget] = useState<number | null>(null);

  const handleModelBuildStart = useCallback(() => {
    setPreviewState("building");
    setPreviewErrorKey(null);
    setExportState("idle");
  }, []);

  const handleModelReady = useCallback((stl: Blob, configKey: string) => {
    setPreviewModel({ configKey, stl });
    setPreviewErrorKey(null);
    setPreviewState("ready");
  }, []);

  const handleModelBuildError = useCallback((configKey: string) => {
    setPreviewErrorKey(configKey);
    setPreviewState("error");
  }, []);

  const currentConfigKey = printableConfigKey(config);
  const previewIsCurrent = previewModel?.configKey === currentConfigKey;
  const visiblePreviewState = previewErrorKey === currentConfigKey
    ? "error"
    : previewIsCurrent ? previewState : "building";
  const previewStl = previewIsCurrent ? previewModel.stl : null;

  const estimatedVolume = useMemo(() => {
    const factor = { 6: 0.93, 8: 0.49, 10: 0.48, 12: 0.64, 20: 0.43 }[config.sides];
    return Math.round(config.size ** 3 * factor / 100) / 10;
  }, [config.size, config.sides]);

  const customWords = useMemo(() => splitFaceWords(customText), [customText]);

  const selectSides = (sides: DieSides) => {
    setConfig((current) => ({
      ...current,
      sides,
      values: current.markStyle === "text"
        ? textPreset === "custom"
          ? customText.trim()
            ? textWordValues(customText, sides)
            : Array.from({ length: sides }, (_, index) => current.values[index] ?? "")
          : textPresetValues(textPreset, sides)
        : standardValues(sides),
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
      values[index] = value.slice(0, config.markStyle === "text" ? 12 : 3);
      return { ...current, values };
    });
    setPreset("custom");
    if (config.markStyle === "text") {
      setTextPreset("custom");
      setCustomText("");
    }
    setExportState("idle");
  };

  const applyTextPreset = (nextPreset: TextPresetId | "custom") => {
    setTextPreset(nextPreset);
    if (nextPreset === "custom") return;
    setCustomText("");
    setConfig((current) => ({
      ...current,
      faceText: "",
      values: textPresetValues(nextPreset, current.sides),
    }));
    setShowFaces(true);
    setExportState("idle");
  };

  const uploadGraphics = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
      .filter((file) => file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))
      .slice(0, 20);
    event.target.value = "";
    if (!files.length) {
      setGraphicUploadState("error");
      return;
    }
    setGraphicUploadState("reading");
    try {
      const graphicDataSet = await Promise.all(files.map(readFileAsDataUrl));
      setConfig((current) => ({
        ...current,
        markStyle: "graphic",
        graphicName: files.length === 1 ? files[0].name : `${files.length} custom SVGs`,
        graphicData: "",
        graphicSetId: "custom",
        graphicDataSet,
        graphicNames: files.map((file) => file.name),
      }));
      setGraphicUploadState("idle");
      setExportState("idle");
    } catch {
      setGraphicUploadState("error");
    }
  };

  const swapGraphicFaces = (from: number, to: number) => {
    if (from === to) return;
    setConfig((current) => {
      const graphics = current.graphicDataSet?.length
        ? current.graphicDataSet
        : current.graphicData ? [current.graphicData] : [];
      const names = current.graphicNames?.length
        ? current.graphicNames
        : [current.graphicName || "Custom SVG"];
      return {
        ...current,
        graphicData: "",
        graphicDataSet: swapFaceAssignments(graphics, from, to, current.sides),
        graphicNames: swapFaceAssignments(names, from, to, current.sides),
      };
    });
    setExportState("idle");
  };

  const handleGraphicKey = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp"
      ? -1
      : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    const target = index + direction;
    if (target >= 0 && target < config.sides) swapGraphicFaces(index, target);
  };

  const handleGraphicDrop = (event: DragEvent<HTMLDivElement>, target: number) => {
    event.preventDefault();
    const transferValue = event.dataTransfer.getData("text/plain");
    const transferred = Number(transferValue);
    const source = transferValue !== "" && Number.isInteger(transferred) ? transferred : draggedGraphicFace;
    if (source !== null) swapGraphicFaces(source, target);
    setDraggedGraphicFace(null);
    setGraphicDropTarget(null);
  };

  const exportModel = async (showPrintOptions = false) => {
    if (config.markStyle === "graphic" && !config.graphicData && !config.graphicDataSet?.length) {
      document.getElementById("graphic-upload")?.click();
      return;
    }
    if (!previewStl) return;
    setExportState("building");
    try {
      const { saveBlob } = await import("./stlExport");
      saveBlob(previewStl, `diceforge-d${config.sides}-${config.size}mm.stl`);
      setExportState("ready");
      if (showPrintOptions) setShowPrintHandoff(true);
    } catch (error) {
      console.error(error);
      setExportState("error");
    }
  };

  const setMarkStyle = (markStyle: MarkStyle) => {
    setConfig((current) => {
      const faceText = current.faceText || "LUCKY";
      const values = markStyle === "text"
        ? textWordValues(customText || faceText, current.sides)
        : markStyle === "numbers" || markStyle === "pips"
          ? standardValues(current.sides)
          : current.values;
      return {
        ...current,
        markStyle,
        values,
        faceText,
        randomPips: false,
        depth: markStyle === "pips" ? Math.min(current.depth, current.pipSize * 0.5) : current.depth,
        ...(markStyle === "graphic" && !current.graphicData && !current.graphicDataSet?.length ? {
          graphicName: DEFAULT_GRAPHIC_THEME.name,
          graphicSetId: DEFAULT_GRAPHIC_THEME.id,
          graphicDataSet: DEFAULT_GRAPHIC_THEME.marks,
          graphicNames: [],
        } : {}),
      };
    });
    setPreset("custom");
    if (markStyle !== "text") setTextPreset("custom");
    setExportState("idle");
  };

  const applyGraphicTheme = (theme: (typeof GRAPHIC_THEMES)[number]) => {
    setConfig((current) => ({
      ...current,
      markStyle: "graphic",
      graphicName: theme.name,
      graphicData: "",
      graphicSetId: theme.id,
      graphicDataSet: theme.marks,
      graphicNames: [],
      color: theme.paper,
    }));
    setPreset("custom");
    setExportState("idle");
  };

  const customGraphics = config.graphicSetId === "custom"
    ? fillFaceSet(config.graphicDataSet?.length ? config.graphicDataSet : config.graphicData ? [config.graphicData] : [], config.sides)
    : [];
  const customGraphicNames = config.graphicSetId === "custom"
    ? fillFaceSet(config.graphicNames?.length ? config.graphicNames : [config.graphicName || "Custom SVG"], config.sides)
    : [];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="DiceForge home">
          <span className="brand-glyph" aria-hidden="true"><i /><i /><i /></span>
          <span>DICEFORGE</span>
        </a>
        <div className="header-note"><span /> BROWSER-BASED / NO SIGN-IN</div>
        <nav className="header-links" aria-label="Site links">
          <a className="ghost-link" href="#about">HOW IT WORKS</a>
          <a className="ghost-link support-link" href="#print-guide">PRINT GUIDE <span>↘</span></a>
        </nav>
      </header>

      <section className="intro" id="top">
        <div className="eyebrow"><span>PRECISION DICE STUDIO</span><span>V1.0</span></div>
        <h1>MAKE CHANCE<br /><em>TANGIBLE.</em></h1>
        <p>Build a one-of-one polyhedral die, tune every face, and export a production-ready STL—right here in your browser.</p>
        <div className="scroll-cue">START FORGING <span>↓</span></div>
      </section>

      <section className="forge-shell" aria-label="Dice model generator">
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
              {(["numbers", "pips", "text", "graphic"] as MarkStyle[]).map((style) => (
                <button key={style} type="button" className={config.markStyle === style ? "selected" : ""} onClick={() => setMarkStyle(style)} aria-pressed={config.markStyle === style}>
                  {style === "graphic" ? "SVG THEMES" : style.toUpperCase()}
                </button>
              ))}
            </div>

            {(config.markStyle === "numbers" || config.markStyle === "text") && (
              <label className="font-picker">
                <span><b>{config.markStyle === "numbers" ? "Number font" : "Text font"}</b><small>Used in preview and STL</small></span>
                <select value={config.font} onChange={(event) => setConfig({ ...config, font: event.target.value as FontId })}>
                  {FONT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            )}

            {config.markStyle === "text" && (
              <>
                <label className="text-set-picker">
                  <span>
                    <b>Curated text set</b>
                    <small>Top {config.sides} of 20 · core ideas appear first</small>
                  </span>
                  <select value={textPreset} onChange={(event) => applyTextPreset(event.target.value as TextPresetId | "custom")}>
                    <option value="custom">Custom word list</option>
                    {TEXT_PRESETS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                  {textPreset !== "custom" && (
                    <small className="text-set-description">{TEXT_PRESETS.find((option) => option.id === textPreset)?.description}</small>
                  )}
                </label>
                <label className="word-list-input">
                  <span>
                    <b>Custom face words</b>
                    <small>
                      {Math.min(customWords.length, config.sides)} / {config.sides} faces filled
                      {customWords.length > config.sides && customWords.length <= 20 ? ` · ${customWords.length - config.sides} ready for a larger die` : ""}
                      {customWords.length > 20 ? ` · ${customWords.length - 20} beyond D20 ignored` : ""}
                    </small>
                  </span>
                  <textarea
                    value={customText}
                    placeholder={"YES NO MAYBE WAIT\nGO STOP RETRY"}
                    onChange={(event) => {
                      const input = event.target.value;
                      const words = splitFaceWords(input);
                      setCustomText(input);
                      setConfig((current) => ({
                        ...current,
                        faceText: words[0] ?? "",
                        values: textWordValues(input, current.sides),
                      }));
                      setTextPreset("custom");
                      setPreset("custom");
                      setShowFaces(true);
                    }}
                  />
                  <small className="word-list-help">Whitespace separates faces · each word is trimmed to 12 characters</small>
                </label>
              </>
            )}

            {config.markStyle === "graphic" && (
              <div className="graphic-picker">
                <div className="graphic-picker-heading">
                  <span><b>Built-in collections</b><small>Six marks cycle across every die size</small></span>
                  <span>{GRAPHIC_THEMES.length} SETS</span>
                </div>
                <div className="theme-grid" role="group" aria-label="Built-in graphic sets">
                  {GRAPHIC_THEMES.map((theme) => (
                    <button
                      type="button"
                      key={theme.id}
                      className={config.graphicSetId === theme.id ? "selected" : ""}
                      aria-pressed={config.graphicSetId === theme.id}
                      onClick={() => applyGraphicTheme(theme)}
                      style={{ "--theme-accent": theme.accent, "--theme-paper": theme.paper } as React.CSSProperties}
                    >
                      <span className="theme-preview" aria-hidden="true">
                        {theme.marks.slice(0, 3).map((item, index) => <img key={index} src={item} alt="" />)}
                      </span>
                      <span className="theme-copy"><b>{theme.name}</b><small>{theme.caption}</small></span>
                      <i aria-hidden="true">↗</i>
                    </button>
                  ))}
                </div>
                <label className={`upload-box ${config.graphicSetId === "custom" ? "selected" : ""}`} htmlFor="graphic-upload">
                  <input id="graphic-upload" type="file" accept="image/svg+xml,.svg" multiple onChange={uploadGraphics} />
                  <span className="upload-icon">＋</span>
                  <span>
                    <b>{graphicUploadState === "reading" ? "Reading your SVGs…" : config.graphicSetId === "custom" ? config.graphicName : "Upload your own set"}</b>
                    <small>Select 1–20 SVGs · file order fills the faces</small>
                  </span>
                  <em>{config.graphicSetId === "custom" ? "REPLACE SET" : "CHOOSE FILES"}</em>
                </label>
                {graphicUploadState === "error" && <p className="graphic-upload-error" role="alert">Choose one or more valid SVG files.</p>}
                {customGraphics.length > 0 && (
                  <section className="graphic-set-editor" aria-labelledby="graphic-set-title">
                    <div className="graphic-set-editor-heading">
                      <span>
                        <b id="graphic-set-title">Face assignments</b>
                        <small>Drag cards to swap · arrow keys also work</small>
                      </span>
                      <span>D{config.sides} / {config.sides} FACES</span>
                    </div>
                    <div className="graphic-face-grid" role="list" aria-label={`SVG assignments for ${config.sides} faces`}>
                      {customGraphics.map((graphic, index) => (
                        <div
                          className={`graphic-face-card ${draggedGraphicFace === index ? "dragging" : ""} ${graphicDropTarget === index ? "drop-target" : ""}`}
                          key={index}
                          role="listitem"
                          tabIndex={0}
                          draggable
                          aria-label={`Face ${index + 1}: ${customGraphicNames[index]}`}
                          onKeyDown={(event) => handleGraphicKey(event, index)}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(index));
                            setDraggedGraphicFace(index);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setGraphicDropTarget(index);
                          }}
                          onDragLeave={() => setGraphicDropTarget((current) => current === index ? null : current)}
                          onDrop={(event) => handleGraphicDrop(event, index)}
                          onDragEnd={() => {
                            setDraggedGraphicFace(null);
                            setGraphicDropTarget(null);
                          }}
                        >
                          <div className="graphic-face-card-top"><span>F{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true">⠿</i></div>
                          <img src={graphic} alt="" draggable={false} />
                          <small title={customGraphicNames[index]}>{customGraphicNames[index]}</small>
                          <div className="graphic-face-moves">
                            <button type="button" disabled={index === 0} aria-label={`Move face ${index + 1} backward`} onClick={() => swapGraphicFaces(index, index - 1)}>←</button>
                            <button type="button" disabled={index === config.sides - 1} aria-label={`Move face ${index + 1} forward`} onClick={() => swapGraphicFaces(index, index + 1)}>→</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {(config.markStyle === "numbers" || config.markStyle === "pips") && (
              <>
                <div className="preset-label"><b>Distribution</b><small>Quick layouts or edit each face</small></div>
                <div className="preset-row">
                  {(["standard", "opposites", "random", "blank"] as DistributionPreset[]).map((option) => (
                    <button key={option} type="button" className={preset === option ? "selected" : ""} onClick={() => applyPreset(option)}>
                      {option === "random" ? config.markStyle === "pips" ? "random pips" : "shuffle" : option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {config.markStyle !== "graphic" && (
              <>
                <button className="face-editor-toggle" type="button" onClick={() => setShowFaces(!showFaces)} aria-expanded={showFaces}>
                  <span>EDIT {config.sides} FACE {config.markStyle === "text" ? "LABELS" : "VALUES"}</span><span>{showFaces ? "−" : "+"}</span>
                </button>
                {showFaces && (
                  <div className="face-grid">
                    {config.values.map((value, index) => (
                      <label key={index}><span>F{String(index + 1).padStart(2, "0")}</span><input aria-label={`Face ${index + 1} value`} value={value} onChange={(event) => updateValue(index, event.target.value)} /></label>
                    ))}
                  </div>
                )}
              </>
            )}

            <label className="range-row depth-row">
              <span><b>Pattern size</b><small>Scale every face mark</small></span>
              <input type="range" min="0.5" max="1.8" step="0.05" value={config.patternScale} onChange={(event) => setConfig({ ...config, patternScale: Number(event.target.value) })} />
              <output>{Math.round(config.patternScale * 100)}<small>%</small></output>
            </label>

            {config.markStyle === "pips" && (
              <label className="range-row">
                <span><b>Pip diameter</b><small>Opening width · spherical bowl</small></span>
                <input type="range" min="0.6" max={MAX_PIP_DIAMETER} step="0.05" value={config.pipSize} onChange={(event) => {
                  const pipSize = Number(event.target.value);
                  setConfig({ ...config, pipSize, depth: Math.min(config.depth, pipSize * 0.5) });
                }} />
                <output>{config.pipSize.toFixed(2)}<small>mm</small></output>
              </label>
            )}

            <label className="range-row">
              <span>
                <b>{config.markStyle === "pips" ? "Pip depth" : "Deboss depth"}</b>
                <small>{config.markStyle === "pips" ? "Spherical cap · no flat bottom" : "Recommended 0.4–0.8 mm"}</small>
              </span>
              <input type="range" min="0.3" max={config.markStyle === "pips" ? Math.min(1.2, config.pipSize * 0.5) : 1.2} step="0.05" value={config.depth} onChange={(event) => setConfig({ ...config, depth: Number(event.target.value) })} />
              <output>{config.depth.toFixed(2)}<small>mm</small></output>
            </label>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-topline">
            <span>STL MODEL / D{config.sides}</span>
            <span className={`live-dot ${visiblePreviewState}`}>
              {visiblePreviewState === "building" ? "● BUILDING" : visiblePreviewState === "error" ? "● ERROR" : "● EXACT STL"}
            </span>
          </div>
          <div className="canvas-wrap">
            <DiceScene
              config={config}
              onBuildStart={handleModelBuildStart}
              onModelReady={handleModelReady}
              onBuildError={handleModelBuildError}
            />
          </div>
          <div className="orbit-note"><span>↻</span> DRAG TO ORBIT · SCROLL TO ZOOM</div>
          <div className="quick-export">
            {exportState === "ready" && <span className="quick-export-status">STL DOWNLOADED ✓</span>}
            {exportState === "error" && <span className="quick-export-status error">EXPORT FAILED — TRY AGAIN</span>}
            <button type="button" onClick={() => exportModel(false)} disabled={exportState === "building" || visiblePreviewState !== "ready"}>
              <span>
                <b>{visiblePreviewState === "building" ? "BUILDING STL…" : exportState === "building" ? "PREPARING DOWNLOAD…" : "EXPORT MODEL"}</b>
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
            <button type="button" className="download-button" onClick={() => exportModel(false)} disabled={exportState === "building" || visiblePreviewState !== "ready"}>
              <span>{visiblePreviewState === "building" ? "BUILDING MODEL…" : exportState === "building" ? "PREPARING DOWNLOAD…" : exportState === "ready" ? "DOWNLOAD AGAIN" : "DOWNLOAD STL"}</span><span>↓</span>
            </button>
            <button type="button" className="print-button" onClick={() => exportModel(true)} disabled={exportState === "building" || visiblePreviewState !== "ready"}>
              <span><b>PRINT WITH FORM NOW</b><small>Downloads STL, then opens print options</small></span><span>↗</span>
            </button>
          </div>
        </div>
      </section>

      {showPrintHandoff && (
        <div className="handoff-backdrop" role="presentation">
          <section className="handoff-dialog" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
            <button className="handoff-close" type="button" aria-label="Close print options" onClick={() => setShowPrintHandoff(false)}>×</button>
            <span className="handoff-kicker">STL DOWNLOADED ✓</span>
            <h2 id="handoff-title">Your die is ready to quote.</h2>
            <p>Upload <b>diceforge-d{config.sides}-{config.size}mm.stl</b> on Form Now to choose a material and finish. Form Now currently ships within the United States.</p>
            <div className="handoff-actions">
              <a href={FORM_NOW_URL} target="_blank" rel="noreferrer">OPEN FORM NOW <span>↗</span></a>
              <button type="button" onClick={() => setShowPrintHandoff(false)}>NOT NOW</button>
            </div>
          </section>
        </div>
      )}

      <section className="how" id="about">
        <span className="vertical-label">WHY DICEFORGE</span>
        <div><span>01</span><h3>Private by default.</h3><p>The entire model is built on your device. Your art stays yours.</p></div>
        <div><span>02</span><h3>Made for resin.</h3><p>Millimeter units and controllable recesses tuned for crisp SLA detail.</p></div>
        <div><span>03</span><h3>From idea to object.</h3><p>Export your STL or move straight into a professional Form Now quote.</p></div>
      </section>

      <section className="support-wrap" id="print-guide">
        <article className="support-article" aria-labelledby="print-guide-title">
          <header className="support-hero">
            <div>
              <span className="support-kicker">SUPPORT / PRINTING 001</span>
              <h2 id="print-guide-title">Print clean.<br /><em>Keep every face crisp.</em></h2>
            </div>
            <p>Good dice prints come down to three things: keep broad faces away from the build plate, put supports on edges instead of artwork, and remove those supports without tearing the surface.</p>
          </header>

          <div className="support-quickstart" aria-label="Resin printing quick start">
            <div><span>PROCESS</span><b>Resin / SLA</b><small>Best for small marks</small></div>
            <div><span>LAYER</span><b>0.03–0.05 mm</b><small>Start at 0.05 mm</small></div>
            <div><span>ORIENTATION</span><b>30–45° tilt</b><small>Tilt on two axes</small></div>
            <div><span>MODEL</span><b>Keep it solid</b><small>Import in millimeters</small></div>
          </div>

          <div className="support-content">
            <aside className="support-index" aria-label="In this printing guide">
              <span>IN THIS GUIDE</span>
              <a href="#prepare-model"><i>01</i> Prepare the model</a>
              <a href="#orient-die"><i>02</i> Choose an angle</a>
              <a href="#support-die"><i>03</i> Place supports</a>
              <a href="#finish-die"><i>04</i> Remove and finish</a>
              <a href="#fix-print"><i>05</i> Fix common defects</a>
            </aside>

            <div className="support-chapters">
              <section id="prepare-model">
                <span className="chapter-number">01 / BEFORE SLICING</span>
                <h3>Prepare the model at full size.</h3>
                <p>DiceForge exports a solid STL in millimeters. Import it at 100% scale and check the displayed dimensions against the size you chose. Do not hollow a die: a hollow shell can trap resin, deform during curing, and make the weight less predictable.</p>
                <div className="support-callout"><b>Do one calibration first.</b><p>Use the resin maker’s tested profile. If fine recesses print narrow or partly closed, calibrate exposure before changing the model.</p></div>
              </section>

              <section id="orient-die">
                <span className="chapter-number">02 / ORIENTATION</span>
                <h3>Make the cross-section grow gradually.</h3>
                <p>Start with a 30–45° tilt, then rotate the die on a second axis. No broad face should sit parallel to the build plate. Aim a corner or short edge toward the plate and keep the face you care about most pointing up and away from the supports.</p>
                <ul>
                  <li>Scrub through the layer preview. Each new island needs support.</li>
                  <li>Avoid sudden, full-face layers; their higher peel load can pull the print out of shape.</li>
                  <li>There is no universal perfect angle—rotate until the layer area grows smoothly for your chosen die.</li>
                </ul>
                <div className="angle-sketch" aria-label="Recommended die orientation diagram">
                  <span className="build-plate">BUILD PLATE</span>
                  <span className="sketch-support one" /><span className="sketch-support two" /><span className="sketch-support three" />
                  <span className="sketch-die">D20</span>
                  <span className="sketch-angle">30–45°</span>
                </div>
              </section>

              <section id="support-die">
                <span className="chapter-number">03 / SUPPORTS</span>
                <h3>Support edges, not artwork.</h3>
                <p>Use medium contacts around the first corner or edge to lock the die in place. Continue upward with smaller contacts distributed along downward-facing edges and corners. Add enough bracing that the model cannot flex during peeling.</p>
                <div className="do-dont-grid">
                  <div><span>DO</span><b>Spread small contact points</b><p>Several light supports leave shallower marks and control movement better than a few oversized tips.</p></div>
                  <div><span>AVOID</span><b>Tips inside marks or on face centers</b><p>Supports in numbers, pips, and broad cosmetic areas are difficult to remove without visible craters.</p></div>
                </div>
                <p className="fine-note">Automatic supports are a starting point. Inspect the first contact area, every island, and long unsupported edges manually before slicing.</p>
              </section>

              <section className="settings-section" aria-labelledby="settings-title">
                <span className="chapter-number">STARTING POINTS</span>
                <h3 id="settings-title">Use a conservative print profile.</h3>
                <div className="settings-table" role="table" aria-label="Suggested dice printing settings">
                  <div className="settings-row settings-head" role="row"><span role="columnheader">SETTING</span><b role="columnheader">RESIN / SLA</b><b role="columnheader">FDM</b></div>
                  <div className="settings-row" role="row"><span role="cell">Layer height</span><b role="cell">0.03–0.05 mm</b><b role="cell">0.08–0.12 mm</b></div>
                  <div className="settings-row" role="row"><span role="cell">Interior</span><b role="cell">Solid model</b><b role="cell">100% infill</b></div>
                  <div className="settings-row" role="row"><span role="cell">Priority</span><b role="cell">Calibrated exposure</b><b role="cell">Tuned first layer</b></div>
                  <div className="settings-row" role="row"><span role="cell">Surface care</span><b role="cell">Tips on edges</b><b role="cell">Seam off key face</b></div>
                </div>
                <p className="fine-note">FDM works best for larger dice and bold marks. Use a 0.25–0.4 mm nozzle, slow outer walls, a small brim, and elephant-foot compensation if your slicer provides it. Resin is the better choice for crisp detail at standard dice sizes.</p>
              </section>

              <section id="finish-die">
                <span className="chapter-number">04 / CLEANUP</span>
                <h3>Clip supports. Never tear them away.</h3>
                <ol className="finish-steps">
                  <li><span>1</span><div><b>Wash and dry</b><p>Follow the resin manufacturer’s wash instructions. Let solvent evaporate completely before curing.</p></div></li>
                  <li><span>2</span><div><b>Cut every contact</b><p>Use flush cutters and leave a tiny nub. Support removal is usually easier before final cure when the resin profile allows it.</p></div></li>
                  <li><span>3</span><div><b>Post-cure evenly</b><p>Use the maker’s time and temperature. Rotate the die midway if your curing station does not expose every side evenly.</p></div></li>
                  <li><span>4</span><div><b>Finish only the nubs</b><p>Once fully cured, lightly wet-sand raised spots with 600–1000 grit. Avoid aggressive sanding on one face or edge.</p></div></li>
                </ol>
                <div className="safety-note"><span>!</span><p><b>Resin safety:</b> wear nitrile gloves and eye protection while handling uncured resin, ventilate the work area, and follow the resin and printer manufacturers’ disposal instructions.</p></div>
              </section>

              <section id="fix-print">
                <span className="chapter-number">05 / TROUBLESHOOTING</span>
                <h3>Read the defect, then change one thing.</h3>
                <div className="trouble-grid">
                  <div><b>Flat face looks swollen</b><p>Increase compound tilt, lower the layer cross-section, and add edge bracing.</p></div>
                  <div><b>Support craters or white scars</b><p>Use smaller contacts, add more of them, and clip instead of twisting.</p></div>
                  <div><b>Numbers or pips close up</b><p>Check exposure calibration, use thinner layers, or increase deboss depth toward 0.5–0.8 mm.</p></div>
                  <div><b>Die leans or warps</b><p>Strengthen the first contact zone and inspect the layer preview for unsupported islands.</p></div>
                  <div><b>FDM bottom edge flares</b><p>Correct first-layer height and flow, reduce bed heat if appropriate, or enable elephant-foot compensation.</p></div>
                  <div><b>One face is over-sanded</b><p>Stop and reprint if geometry changed. Cosmetic cleanup should remove nubs, not reshape the die.</p></div>
                </div>
                <p className="fairness-note"><b>A note on fairness.</b> Home-printed dice can carry small material and process biases even when they look perfect. They are great for prototypes, display, and casual play; precision or regulated play requires professionally balanced dice.</p>
              </section>
            </div>
          </div>
        </article>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-glyph"><i /><i /><i /></span><span>DICEFORGE</span></a><a className="footer-guide" href="#print-guide">PRINTING SUPPORT ↗</a><span>© 2026 · BUILT FOR MAKERS</span></footer>
    </main>
  );
}
