import type { NoteModel, TimeSignature, QuantizeGrid, Clef } from "./types";
import { gridDivisions, decomposeDuration, type NoteValue } from "./durations";

export interface MusicXmlOptions {
  tempo: number;
  keyFifths: number;
  timeSig: TimeSignature;
  quantizeGrid: QuantizeGrid;
  clef: Clef;
  /** When true, render a two-staff grand staff (treble + bass), splitting notes at middle C. */
  grandStaff?: boolean;
  partName?: string;
  miscellaneous?: Record<string, string>;
}

interface Token {
  kind: "note" | "rest";
  pitches: number[]; // empty for a rest
  value: NoteValue;
  tieStart: boolean;
  tieStop: boolean;
}

interface Elem {
  start: number;
  units: number;
  kind: "note" | "rest";
  pitches: number[];
}

const SHARP_SPELL: ReadonlyArray<readonly [string, number]> = [
  ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
];
const FLAT_SPELL: ReadonlyArray<readonly [string, number]> = [
  ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
];

function spellPitch(midi: number, keyFifths: number): { step: string; alter: number; octave: number } {
  const [step, alter] = (keyFifths >= 0 ? SHARP_SPELL : FLAT_SPELL)[((midi % 12) + 12) % 12];
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
}

function clefXml(clef: Clef, num?: number): string {
  const n = num ? ` number="${num}"` : "";
  switch (clef) {
    case "bass": return `<clef${n}><sign>F</sign><line>4</line></clef>`;
    case "alto": return `<clef${n}><sign>C</sign><line>3</line></clef>`;
    case "tenor": return `<clef${n}><sign>C</sign><line>4</line></clef>`;
    default: return `<clef${n}><sign>G</sign><line>2</line></clef>`;
  }
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Quantize + group simultaneous notes into chords, then build a clamped, gap-filled
 *  monophonic-by-onset timeline. Returns the elements and the end cursor (in units). */
function buildTimeline(notes: NoteModel[], divisions: number): { elems: Elem[]; cursor: number } {
  const byStart = new Map<number, { start: number; dur: number; pitches: number[] }>();
  for (const n of notes) {
    const start = Math.round(n.startBeats * divisions);
    if (start < 0) continue; // notes left of the clip start are outside the rendered grid
    const dur = Math.max(1, Math.round(n.durationBeats * divisions));
    const g = byStart.get(start);
    if (g) { g.pitches.push(n.midi); g.dur = Math.max(g.dur, dur); }
    else byStart.set(start, { start, dur, pitches: [n.midi] });
  }
  const groups = [...byStart.values()].sort((a, b) => a.start - b.start);
  const elems: Elem[] = [];
  let cursor = 0;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.start > cursor) elems.push({ start: cursor, units: g.start - cursor, kind: "rest", pitches: [] });
    const next = i + 1 < groups.length ? groups[i + 1].start : Infinity;
    const dur = Math.max(1, Math.min(g.dur, next - g.start));
    elems.push({ start: g.start, units: dur, kind: "note", pitches: [...g.pitches].sort((a, b) => a - b) });
    cursor = g.start + dur;
  }
  return { elems, cursor };
}

/** Pad the timeline with a trailing rest to fill all measures, then split each element at
 *  barlines, decompose into renderable note values, and assign ties. */
function timelineToMeasures(
  elems: Elem[], cursor: number, divisions: number, upm: number, totalMeasures: number, totalUnits: number,
): Token[][] {
  const padded = cursor < totalUnits
    ? [...elems, { start: cursor, units: totalUnits - cursor, kind: "rest" as const, pitches: [] }]
    : elems;
  const measures: Token[][] = Array.from({ length: totalMeasures }, () => []);
  for (const el of padded) {
    const pieces: { measureIndex: number; value: NoteValue }[] = [];
    let pos = el.start, rem = el.units;
    while (rem > 0) {
      const mi = Math.floor(pos / upm);
      const seg = Math.min(rem, (mi + 1) * upm - pos);
      for (const v of decomposeDuration(seg, divisions)) pieces.push({ measureIndex: mi, value: v });
      pos += seg; rem -= seg;
    }
    pieces.forEach((p, i) => {
      measures[p.measureIndex].push({
        kind: el.kind,
        pitches: el.pitches,
        value: p.value,
        tieStart: el.kind === "note" && i < pieces.length - 1,
        tieStop: el.kind === "note" && i > 0,
      });
    });
  }
  return measures;
}

/** Emit one staff's worth of notes for a single measure (optionally tagged with a staff number). */
function emitStaff(out: string[], tokens: Token[], keyFifths: number, upm: number, voice: number, staff?: number): void {
  const staffEl = staff ? `<staff>${staff}</staff>` : "";
  const allRest = tokens.length === 0 || tokens.every((t) => t.kind === "rest");
  if (allRest) {
    // A fully-silent measure renders as a single centered whole-measure rest.
    out.push(`<note><rest measure="yes"/><duration>${upm}</duration><voice>${voice}</voice>${staffEl}</note>`);
    return;
  }
  for (const t of tokens) {
    const dots = "<dot/>".repeat(t.value.dots);
    if (t.kind === "rest") {
      out.push(`<note><rest/><duration>${t.value.units}</duration><voice>${voice}</voice><type>${t.value.type}</type>${dots}${staffEl}</note>`);
    } else {
      const tieEls = `${t.tieStop ? '<tie type="stop"/>' : ""}${t.tieStart ? '<tie type="start"/>' : ""}`;
      const tiedEls = `${t.tieStop ? '<tied type="stop"/>' : ""}${t.tieStart ? '<tied type="start"/>' : ""}`;
      const notations = tiedEls ? `<notations>${tiedEls}</notations>` : "";
      t.pitches.forEach((midi, pi) => {
        const { step, alter, octave } = spellPitch(midi, keyFifths);
        const chord = pi > 0 ? "<chord/>" : "";
        const alterXml = alter !== 0 ? `<alter>${alter}</alter>` : "";
        out.push(`<note>${chord}<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch><duration>${t.value.units}</duration>${tieEls}<voice>${voice}</voice><type>${t.value.type}</type>${dots}${staffEl}${notations}</note>`);
      });
    }
  }
}

interface VoiceLayer {
  voice: number;
  staff?: number;
  measures: Token[][];
}

export function notesToMusicXML(notes: NoteModel[], opts: MusicXmlOptions): string {
  const divisions = gridDivisions(opts.quantizeGrid);
  const upm = Math.round(opts.timeSig.numerator * (4 / opts.timeSig.denominator) * divisions); // units/measure

  let layers: VoiceLayer[];
  let totalMeasures: number;
  if (opts.grandStaff) {
    const treble = buildTimeline(notes.filter((n) => n.midi >= 60), divisions); // middle C and up
    const bass = buildTimeline(notes.filter((n) => n.midi < 60), divisions);
    totalMeasures = Math.max(1, Math.ceil(treble.cursor / upm), Math.ceil(bass.cursor / upm));
    const totalUnits = totalMeasures * upm;
    layers = [
      { voice: 1, staff: 1, measures: timelineToMeasures(treble.elems, treble.cursor, divisions, upm, totalMeasures, totalUnits) },
      { voice: 2, staff: 2, measures: timelineToMeasures(bass.elems, bass.cursor, divisions, upm, totalMeasures, totalUnits) },
    ];
  } else {
    const t = buildTimeline(notes, divisions);
    totalMeasures = Math.max(1, Math.ceil(t.cursor / upm));
    const totalUnits = totalMeasures * upm;
    layers = [{ voice: 1, measures: timelineToMeasures(t.elems, t.cursor, divisions, upm, totalMeasures, totalUnits) }];
  }

  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  out.push('<score-partwise version="4.0">');
  out.push("<identification><encoding><software>ableton-sheet-music-extension</software></encoding>");
  if (opts.miscellaneous && Object.keys(opts.miscellaneous).length) {
    out.push("<miscellaneous>");
    for (const [k, v] of Object.entries(opts.miscellaneous)) {
      out.push(`<miscellaneous-field name="${xmlEscape(k)}">${xmlEscape(v)}</miscellaneous-field>`);
    }
    out.push("</miscellaneous>");
  }
  out.push("</identification>");
  out.push(`<part-list><score-part id="P1"><part-name>${xmlEscape(opts.partName ?? "Part")}</part-name></score-part></part-list>`);
  out.push('<part id="P1">');

  const tempo = Math.round(opts.tempo);
  for (let mi = 0; mi < totalMeasures; mi++) {
    out.push(`<measure number="${mi + 1}">`);
    if (mi === 0) {
      out.push("<attributes>");
      out.push(`<divisions>${divisions}</divisions>`);
      out.push(`<key><fifths>${opts.keyFifths}</fifths></key>`);
      out.push(`<time><beats>${opts.timeSig.numerator}</beats><beat-type>${opts.timeSig.denominator}</beat-type></time>`);
      if (opts.grandStaff) {
        out.push("<staves>2</staves>");
        out.push(clefXml("treble", 1));
        out.push(clefXml("bass", 2));
      } else {
        out.push(clefXml(opts.clef));
      }
      out.push("</attributes>");
      out.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`);
    }
    layers.forEach((layer, li) => {
      if (li > 0) out.push(`<backup><duration>${upm}</duration></backup>`);
      emitStaff(out, layer.measures[mi], opts.keyFifths, upm, layer.voice, layer.staff);
    });
    out.push("</measure>");
  }

  out.push("</part>");
  out.push("</score-partwise>");
  return out.join("\n");
}
