import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { transpose } from "../../src/notation/transpose";
import { notesToMusicXML } from "../../src/notation/musicxml";
import { detectStaff } from "../../src/notation/clef";
import type { ChartPayload, ChartResult, ExportedFile, ExportFormat } from "../../src/payload";
import type { Clef, InstrumentProfile, QuantizeGrid } from "../../src/notation/types";

const payload: ChartPayload = JSON.parse(
  (document.getElementById("chart-payload") as HTMLScriptElement).textContent!,
);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const instrumentSel = $<HTMLSelectElement>("instrument");
const semitonesInput = $<HTMLInputElement>("semitones");
const clefSel = $<HTMLSelectElement>("clef");
const gridSel = $<HTMLSelectElement>("grid");
const tsNum = $<HTMLInputElement>("tsNum");
const tsDen = $<HTMLInputElement>("tsDen");
const scoreEl = $<HTMLDivElement>("score");
const statusEl = $<HTMLSpanElement>("status");

const CUSTOM = "Custom";

// ---- Transpose state: a single integer `semitones` is the source of truth. ----
let semitones = 0;
let presetClef: Clef = "treble";

function presetByOffset(n: number): InstrumentProfile | undefined {
  return payload.instruments.find((p) => p.semitoneOffset === n);
}

/** The profile to render with: a matching preset, or a synthetic Custom profile. */
function currentProfile(): InstrumentProfile {
  const preset = presetByOffset(semitones);
  if (preset) return preset;
  const sign = semitones >= 0 ? "+" : "";
  return { name: `Custom (${sign}${semitones})`, semitoneOffset: semitones, clef: presetClef };
}

/** Reflect the current semitones in the instrument dropdown (preset name or "Custom"). */
function syncInstrumentSelect(): void {
  const preset = presetByOffset(semitones);
  if (preset) {
    instrumentSel.value = preset.name;
    presetClef = preset.clef;
  } else {
    instrumentSel.value = CUSTOM;
  }
}

function setSemitones(n: number): void {
  semitones = Number.isFinite(n) ? Math.trunc(n) : 0;
  semitonesInput.value = String(semitones);
  syncInstrumentSelect();
  void render();
}

/** Concert notes shifted to the current written pitch. */
function writtenNotes() {
  return transpose(payload.notes, payload.concertKeyFifths, currentProfile()).notes;
}

// ---- Populate controls from the payload + remembered settings. ----
for (const profile of payload.instruments) {
  const opt = document.createElement("option");
  opt.value = profile.name;
  opt.textContent = profile.name;
  instrumentSel.appendChild(opt);
}
const customOpt = document.createElement("option");
customOpt.value = CUSTOM;
customOpt.textContent = "Custom";
instrumentSel.appendChild(customOpt);

gridSel.value = payload.quantizeGrid; // auto-detected from the clip on load
tsNum.value = String(payload.timeSig.numerator);
tsDen.value = String(payload.timeSig.denominator);

// Initialise transpose from the remembered instrument (defaults to Concert / C = 0).
const initial = payload.instruments.find((p) => p.name === payload.settings.instrument);
semitones = initial ? initial.semitoneOffset : 0;
presetClef = initial ? initial.clef : "treble";
semitonesInput.value = String(semitones);
syncInstrumentSelect();

// Auto-detect the staff/clef from the written pitch range (user can override below).
clefSel.value = detectStaff(writtenNotes());

// ---- OSMD (SVG backend → crisp display + vector PDF via svg2pdf) ----
const osmd = new OpenSheetMusicDisplay(scoreEl, {
  backend: "svg",
  drawTitle: false,
  drawingParameters: "compacttight",
  autoResize: true,
  autoBeam: true, // group eighth/sixteenth notes by beat
});

function tsValue(el: HTMLInputElement, fallback: number): number {
  const v = Number(el.value);
  return v > 0 ? v : fallback;
}

function currentGrid(): QuantizeGrid {
  return gridSel.value as QuantizeGrid;
}

function buildMusicXml(): string {
  const profile = currentProfile();
  const t = transpose(payload.notes, payload.concertKeyFifths, profile);
  const isGrand = clefSel.value === "grand";
  return notesToMusicXML(t.notes, {
    tempo: payload.tempo,
    keyFifths: t.keyFifths,
    timeSig: { numerator: tsValue(tsNum, 4), denominator: tsValue(tsDen, 4) },
    quantizeGrid: currentGrid(),
    clef: isGrand ? "treble" : (clefSel.value as Clef),
    grandStaff: isGrand,
    partName: `${payload.clipName} — ${profile.name}`,
    miscellaneous: {
      source: payload.provenance.clipName,
      instrument: profile.name,
      tempo: String(payload.provenance.tempo),
      concertKeyFifths: String(payload.provenance.concertKeyFifths),
      fingerprint: payload.provenance.fingerprint,
      generatedAt: payload.provenance.generatedAt,
    },
  });
}

function updateStatus(): void {
  const p = payload.provenance;
  statusEl.textContent = `${p.clipName} · ${currentProfile().name} · ${p.tempo} bpm · ${tsValue(tsNum, 4)}/${tsValue(tsDen, 4)} · #${p.fingerprint}`;
}

async function render(): Promise<string> {
  const xml = buildMusicXml();
  await osmd.load(xml);
  osmd.render();
  updateStatus();
  return xml;
}

function footerText(): string {
  const p = payload.provenance;
  return `${p.clipName} · ${currentProfile().name} · ${p.tempo} bpm · #${p.fingerprint} · ${p.generatedAt}`;
}

function getSvg(): SVGSVGElement {
  const svg = scoreEl.querySelector("svg");
  if (!svg) throw new Error("no rendered score");
  return svg as SVGSVGElement;
}

function svgSize(svg: SVGSVGElement): { w: number; h: number } {
  const r = svg.getBoundingClientRect();
  return { w: r.width || svg.width.baseVal.value, h: r.height || svg.height.baseVal.value };
}

/** Vector PDF: render the OSMD SVG into a jsPDF with svg2pdf, plus a footer. */
async function buildPdfBase64(): Promise<string> {
  const svg = getSvg();
  const { w, h } = svgSize(svg);
  const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const scale = Math.min((pageW - margin * 2) / w, (pageH - margin * 2 - 16) / h, 1);
  await svg2pdf(svg, pdf, { x: margin, y: margin, width: w * scale, height: h * scale });
  pdf.setFontSize(8);
  pdf.setTextColor(110);
  pdf.text(footerText(), margin, pageH - 12);
  return pdf.output("datauristring").split(",")[1];
}

/** Raster PNG: draw the OSMD SVG onto a canvas (white bg + provenance footer). */
async function buildPngBase64(): Promise<string> {
  const svg = getSvg();
  const { w, h } = svgSize(svg);
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("could not rasterize the score"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  });
  const pad = 24;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + pad;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.fillStyle = "#666";
  ctx.font = "12px sans-serif";
  ctx.fillText(footerText(), 8, h + 16);
  return canvas.toDataURL("image/png").split(",")[1];
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "chart";
}

function postResult(result: ChartResult): void {
  const message = { method: "close_and_send", params: [JSON.stringify(result)] };
  const w = window as unknown as {
    webkit?: { messageHandlers?: { live?: { postMessage(m: unknown): void } } };
    chrome?: { webview?: { postMessage(m: unknown): void } };
  };
  if (w.webkit?.messageHandlers?.live) w.webkit.messageHandlers.live.postMessage(message);
  else if (w.chrome?.webview) w.chrome.webview.postMessage(message);
  else console.log("close_and_send", message); // browser dev fallback
}

/**
 * Export one chosen format. The file is handed to the extension via
 * close_and_send, which writes it to the storage folder, reveals it in Finder,
 * and closes the modal.
 */
async function exportFormat(fmt: ExportFormat): Promise<void> {
  const xml = await render(); // ensure the SVG reflects the current controls
  const base = sanitize(`${payload.clipName} — ${currentProfile().name}`);
  let file: ExportedFile;
  if (fmt === "musicxml") {
    file = { name: `${base}.musicxml`, format: "musicxml", encoding: "text", data: xml };
  } else if (fmt === "png") {
    file = { name: `${base}.png`, format: "png", encoding: "base64", data: await buildPngBase64() };
  } else {
    file = { name: `${base}.pdf`, format: "pdf", encoding: "base64", data: await buildPdfBase64() };
  }
  postResult({
    files: [file],
    settings: { instrument: currentProfile().name, quantizeGrid: currentGrid(), formats: [fmt] },
    fingerprint: payload.fingerprint,
  });
}

// ---- Popovers (export, quantize, time) ----
const POPOVERS: ReadonlyArray<[toggle: string, panel: string]> = [
  ["transposeToggle", "transposePanel"],
  ["exportToggle", "exportPanel"],
  ["quantizeToggle", "quantizePanel"],
  ["timeToggle", "timePanel"],
];

function closeAllPopovers(): void {
  for (const [toggle, panel] of POPOVERS) {
    $<HTMLDivElement>(panel).hidden = true;
    $(toggle).setAttribute("aria-expanded", "false");
  }
}

for (const [toggleId, panelId] of POPOVERS) {
  const toggle = $<HTMLButtonElement>(toggleId);
  const panel = $<HTMLDivElement>(panelId);
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = panel.hidden;
    closeAllPopovers();
    panel.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  panel.addEventListener("click", (e) => e.stopPropagation());
}
document.addEventListener("click", closeAllPopovers);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllPopovers();
});

// ---- Control wiring ----
instrumentSel.addEventListener("change", () => {
  if (instrumentSel.value === CUSTOM) {
    void render();
    return;
  }
  const p = payload.instruments.find((x) => x.name === instrumentSel.value);
  if (p) {
    semitones = p.semitoneOffset;
    presetClef = p.clef;
    semitonesInput.value = String(semitones);
    void render();
  }
});
semitonesInput.addEventListener("change", () => setSemitones(Number(semitonesInput.value)));
$<HTMLButtonElement>("semiDown").addEventListener("click", () => setSemitones(semitones - 1));
$<HTMLButtonElement>("semiUp").addEventListener("click", () => setSemitones(semitones + 1));
clefSel.addEventListener("change", () => void render());
gridSel.addEventListener("change", () => void render());
tsNum.addEventListener("change", () => void render());
tsDen.addEventListener("change", () => void render());
for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>(".exportFmt"))) {
  btn.addEventListener("click", () => void exportFormat(btn.dataset.fmt as ExportFormat));
}
// Close without exporting (the SDK modal has no working native close button).
$<HTMLButtonElement>("closeBtn").addEventListener("click", () =>
  postResult({
    files: [],
    settings: { instrument: currentProfile().name, quantizeGrid: currentGrid(), formats: payload.settings.formats },
    fingerprint: payload.fingerprint,
  }),
);

// ---- Initial render. Defer past layout (two frames) so OSMD measures a real
// container width — otherwise the first render draws empty staff lines. ----
function showError(err: unknown): void {
  scoreEl.innerHTML = `<pre style="color:#b00;white-space:pre-wrap">Render failed: ${String(err)}</pre>`;
  console.error(err);
}
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    void render().catch(showError);
  }),
);
