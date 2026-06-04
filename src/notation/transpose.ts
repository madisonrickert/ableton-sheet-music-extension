import type { InstrumentProfile, NoteModel } from "./types";

export const INSTRUMENTS: InstrumentProfile[] = [
  { name: "Concert / C", semitoneOffset: 0, clef: "treble" },
  { name: "Eb Alto Sax", semitoneOffset: 9, clef: "treble" },
  { name: "Bb (Trumpet / Soprano Sax / Clarinet)", semitoneOffset: 2, clef: "treble" },
  { name: "Bb Tenor Sax", semitoneOffset: 14, clef: "treble" },
  { name: "Eb Baritone Sax", semitoneOffset: 21, clef: "treble" },
  { name: "F (Horn / English Horn)", semitoneOffset: 7, clef: "treble" },
];

export function getProfile(name: string): InstrumentProfile {
  const found = INSTRUMENTS.find((p) => p.name === name);
  return found ?? INSTRUMENTS[0];
}

/** Reduce a fifths count to the conventional range [-5, 6]. */
export function normalizeFifths(fifths: number): number {
  let r = ((fifths % 12) + 12) % 12; // 0..11
  if (r > 6) r -= 12; // -5..6
  return r;
}

export interface TransposeResult {
  notes: NoteModel[];
  keyFifths: number;
  clef: InstrumentProfile["clef"];
}

/**
 * Shift concert-pitch notes to the instrument's written pitch and transpose the
 * key signature by the same pitch-class interval (each ascending semitone = +7 fifths).
 */
export function transpose(
  notes: NoteModel[],
  concertKeyFifths: number,
  profile: InstrumentProfile,
): TransposeResult {
  const shifted = notes.map((n) => ({ ...n, midi: n.midi + profile.semitoneOffset }));
  const pcOffset = ((profile.semitoneOffset % 12) + 12) % 12;
  const keyFifths = normalizeFifths(concertKeyFifths + 7 * pcOffset);
  return { notes: shifted, keyFifths, clef: profile.clef };
}
