import type { NoteDescription } from "@ableton-extensions/sdk";
import type { NoteModel } from "./types";

/**
 * Map Live's note descriptions to internal NoteModels (unmuted, sorted).
 * The SDK returns BigInt at runtime for these numeric fields (its .d.ts says
 * `number`), so coerce with Number() at the boundary — otherwise downstream
 * JSON.stringify and arithmetic throw on BigInt.
 */
export function toNoteModels(notes: NoteDescription[]): NoteModel[] {
  return notes
    .filter((n) => !n.muted)
    .map((n) => ({ midi: Number(n.pitch), startBeats: Number(n.startTime), durationBeats: Number(n.duration) }))
    .sort((a, b) => a.startBeats - b.startBeats || a.midi - b.midi);
}
