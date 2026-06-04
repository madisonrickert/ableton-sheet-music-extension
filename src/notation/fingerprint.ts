import type { NoteModel } from "./types";

/** Pure FNV-1a 32-bit hash over normalized notes; first 6 hex chars. No node:crypto so it stays portable. */
export function fingerprintNotes(notes: NoteModel[]): string {
  const canon = notes
    .map((n) => `${n.midi}:${n.startBeats.toFixed(4)}:${n.durationBeats.toFixed(4)}`)
    .sort()
    .join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}
