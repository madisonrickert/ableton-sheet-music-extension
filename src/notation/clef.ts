import type { NoteModel } from "./types";

export type StaffMode = "treble" | "bass" | "grand";

/**
 * Auto-detect the staff layout from a clip's (written) pitch range:
 * - "grand" when the notes genuinely straddle middle C — a meaningful share on
 *   each side (≥25%) and a wide overall range (≥16 semitones) — i.e. piano-like
 *   material that wants two staves;
 * - otherwise "bass" if the median note is below middle C (MIDI 60), else "treble".
 * Empty -> "treble". The user can override via the clef dropdown.
 */
export function detectStaff(notes: NoteModel[]): StaffMode {
  if (notes.length === 0) return "treble";
  let below = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const n of notes) {
    if (n.midi < 60) below++;
    if (n.midi < min) min = n.midi;
    if (n.midi > max) max = n.midi;
  }
  const above = notes.length - below;
  if (below >= notes.length * 0.25 && above >= notes.length * 0.25 && max - min >= 16) {
    return "grand";
  }
  const sorted = notes.map((n) => n.midi).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] < 60 ? "bass" : "treble";
}
