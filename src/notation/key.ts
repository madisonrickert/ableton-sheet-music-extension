// Major-key fifths indexed by pitch class (0 = C .. 11 = B).
// pc 6 is the toss-up (F# +6 vs Gb -6); we bias sharp (+6) to match sharp-spelling default.
const MAJOR_FIFTHS_BY_PC = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];

/**
 * Concert key signature as a fifths count (+ sharps / - flats) from Live's
 * rootNote (0-11) and scaleName. Minor names map to their relative major.
 * Unknown/modal names are approximated as major (MVP — see plan refinement #5).
 */
export function keyToFifths(rootNote: number, scaleName: string): number {
  const pc = ((rootNote % 12) + 12) % 12;
  const isMinor = /min/i.test(scaleName);
  const idx = isMinor ? (pc + 3) % 12 : pc;
  return MAJOR_FIFTHS_BY_PC[idx];
}
