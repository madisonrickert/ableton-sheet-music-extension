import type { InstrumentProfile, NoteModel, QuantizeGrid, TimeSignature } from "./notation/types";

export type ExportFormat = "musicxml" | "pdf" | "png";

export interface ChartSettings {
  instrument: string;
  quantizeGrid: QuantizeGrid;
  formats: ExportFormat[];
}

export interface ChartProvenance {
  clipName: string;
  tempo: number;
  concertKeyFifths: number;
  fingerprint: string;
  generatedAt: string; // ISO timestamp
}

/** Everything the webview needs to render, transpose, export, and self-identify a chart. */
export interface ChartPayload {
  clipName: string;
  notes: NoteModel[];
  concertKeyFifths: number;
  tempo: number;
  timeSig: TimeSignature;
  quantizeGrid: QuantizeGrid;
  instruments: InstrumentProfile[];
  settings: ChartSettings;
  fingerprint: string; // of the current live notes
  lastExportFingerprint: string | null; // from last-export.json, for the staleness banner
  provenance: ChartProvenance;
}

/** A single artifact the webview returns. */
export interface ExportedFile {
  name: string;
  format: ExportFormat;
  encoding: "text" | "base64";
  data: string;
}

/** What the webview posts back via close_and_send (JSON-stringified). */
export interface ChartResult {
  files: ExportedFile[];
  settings: ChartSettings;
  fingerprint: string;
}

export const PAYLOAD_TOKEN = "__CHART_PAYLOAD_JSON__";
export const LICENSES_TOKEN = "__THIRD_PARTY_LICENSES_JSON__";

/**
 * Escape `<` so the JSON cannot break out of its <script type="application/json"> host
 * (prevents a literal `</script>`). JSON.parse turns `<` back into `<` on read.
 */
export function escapeForScriptJson(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/** Replace the payload token in the bundled webview HTML with the escaped payload JSON. */
export function injectPayload(html: string, payload: ChartPayload): string {
  if (!html.includes(PAYLOAD_TOKEN)) throw new Error("payload token not found in webview HTML");
  return html.replace(PAYLOAD_TOKEN, escapeForScriptJson(JSON.stringify(payload)));
}

/**
 * Replace the licenses token with the build-generated third-party notices, encoded
 * as a JSON string so the (multi-line, punctuation-heavy) text can't break out of its
 * <script type="application/json"> host. The webview JSON.parses it and renders it as
 * textContent — never innerHTML — so there is no HTML-injection surface.
 */
export function injectLicenses(html: string, notices: string): string {
  if (!html.includes(LICENSES_TOKEN)) throw new Error("licenses token not found in webview HTML");
  return html.replace(LICENSES_TOKEN, escapeForScriptJson(JSON.stringify(notices)));
}
