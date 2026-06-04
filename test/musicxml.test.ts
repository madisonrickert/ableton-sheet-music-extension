import { describe, it, expect } from "vitest";
import { notesToMusicXML } from "../src/notation/musicxml";
import type { NoteModel } from "../src/notation/types";

const opts = (over: Partial<Parameters<typeof notesToMusicXML>[1]> = {}) => ({
  tempo: 120,
  keyFifths: 0,
  timeSig: { numerator: 4, denominator: 4 },
  quantizeGrid: "1/16" as const,
  clef: "treble" as const,
  ...over,
});

describe("notesToMusicXML", () => {
  it("emits a valid score-partwise skeleton with attributes in measure 1", () => {
    const notes: NoteModel[] = [{ midi: 60, startBeats: 0, durationBeats: 1 }];
    const xml = notesToMusicXML(notes, opts());
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain("<divisions>4</divisions>");
    expect(xml).toContain("<fifths>0</fifths>");
    expect(xml).toContain("<beats>4</beats>");
    expect(xml).toContain("<beat-type>4</beat-type>");
    expect(xml).toContain("<sign>G</sign><line>2</line>");
    expect(xml).toContain("<per-minute>120</per-minute>");
    expect(xml.match(/<measure number=/g)?.length).toBe(1);
  });

  it("spells the alto-sax §8 case: written A4 in A major (3 sharps)", () => {
    const notes: NoteModel[] = [{ midi: 69, startBeats: 0, durationBeats: 4 }];
    const xml = notesToMusicXML(notes, opts({ keyFifths: 3 }));
    expect(xml).toContain("<step>A</step>");
    expect(xml).toContain("<octave>4</octave>");
    expect(xml).toContain("<fifths>3</fifths>");
    expect(xml).toContain("<type>whole</type>"); // 4 beats = whole note
  });

  it("inserts a rest before a delayed note", () => {
    const notes: NoteModel[] = [{ midi: 60, startBeats: 1, durationBeats: 1 }];
    const xml = notesToMusicXML(notes, opts());
    expect(xml).toContain("<rest/>");
  });

  it("renders simultaneous notes as a chord (<chord/> on the second pitch)", () => {
    const notes: NoteModel[] = [
      { midi: 60, startBeats: 0, durationBeats: 1 },
      { midi: 64, startBeats: 0, durationBeats: 1 },
    ];
    const xml = notesToMusicXML(notes, opts());
    expect(xml).toContain("<chord/>");
  });

  it("ties a note that crosses a barline", () => {
    // a whole note starting on beat 3 of 4/4 spills into measure 2
    const notes: NoteModel[] = [{ midi: 60, startBeats: 2, durationBeats: 4 }];
    const xml = notesToMusicXML(notes, opts());
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tie type="stop"/>');
    expect(xml.match(/<measure number=/g)?.length).toBe(2);
  });

  it("uses flat spelling when keyFifths < 0", () => {
    const notes: NoteModel[] = [{ midi: 61, startBeats: 0, durationBeats: 1 }]; // Db/C#
    const xml = notesToMusicXML(notes, opts({ keyFifths: -2 }));
    expect(xml).toContain("<step>D</step>");
    expect(xml).toContain("<alter>-1</alter>");
  });

  it("embeds provenance miscellaneous fields", () => {
    const notes: NoteModel[] = [{ midi: 60, startBeats: 0, durationBeats: 1 }];
    const xml = notesToMusicXML(notes, opts({ miscellaneous: { source: "Verse Sax", fingerprint: "a3f9c1" } }));
    expect(xml).toContain('<miscellaneous-field name="source">Verse Sax</miscellaneous-field>');
    expect(xml).toContain('<miscellaneous-field name="fingerprint">a3f9c1</miscellaneous-field>');
  });

  it("grand staff: two staves with treble+bass clefs, per-staff notes, and a backup", () => {
    const notes: NoteModel[] = [
      { midi: 72, startBeats: 0, durationBeats: 4 }, // C5 -> treble (staff 1)
      { midi: 48, startBeats: 0, durationBeats: 4 }, // C3 -> bass (staff 2)
    ];
    const xml = notesToMusicXML(notes, opts({ grandStaff: true }));
    expect(xml).toContain("<staves>2</staves>");
    expect(xml).toContain('<clef number="1"><sign>G</sign><line>2</line></clef>');
    expect(xml).toContain('<clef number="2"><sign>F</sign><line>4</line></clef>');
    expect(xml).toContain("<staff>1</staff>");
    expect(xml).toContain("<staff>2</staff>");
    expect(xml).toContain("<backup><duration>");
  });

  it("renders an empty clip as a single whole-measure rest", () => {
    const xml = notesToMusicXML([], opts());
    expect(xml).toContain('<rest measure="yes"/>');
    expect(xml.match(/<measure number=/g)?.length).toBe(1);
  });

  it("ignores notes before the clip start instead of crashing", () => {
    // Ableton notes can sit left of the clip start (negative startTime).
    const notes: NoteModel[] = [
      { midi: 60, startBeats: -0.5, durationBeats: 1 },
      { midi: 62, startBeats: 0, durationBeats: 1 },
    ];
    expect(() => notesToMusicXML(notes, opts())).not.toThrow();
    const xml = notesToMusicXML(notes, opts());
    expect(xml).toContain("<step>D</step>"); // the valid note (midi 62 = D) still renders
  });
});
