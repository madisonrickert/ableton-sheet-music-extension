import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Guards the shipped license compliance: a real `vite build` must regenerate the
// third-party notices, and every bundled package whose license requires it must
// appear with its full text. If a future dependency silently drops out of the
// bundle's notices, this fails loudly — that's the whole point of the test.
const reportPath = fileURLToPath(new URL("../ui/dist/third-party-licenses.txt", import.meta.url));

describe("third-party license notices", () => {
  let report = "";

  beforeAll(() => {
    // npm picks the right local vite; build:ui is what runs rollup-plugin-license.
    execFileSync("npm", ["run", "build:ui"], { stdio: "inherit" });
    report = readFileSync(reportPath, "utf-8");
  });

  it("reproduces OSMD's BSD-3-Clause notice (copyright + binary-redistribution clause)", () => {
    expect(report).toContain("opensheetmusicdisplay");
    expect(report).toContain("BSD-3-Clause");
    expect(report).toContain("Copyright 2019 PhonicScore");
    // Clause 2 is the actual obligation we're satisfying by shipping this file.
    expect(report).toMatch(/Redistributions in binary form must reproduce/);
  });

  it("reproduces the MIT-licensed bundled dependencies", () => {
    for (const pkg of ["jspdf", "svg2pdf.js"]) {
      expect(report).toContain(pkg);
    }
    expect(report).toContain("MIT");
    expect(report).toMatch(/Permission is hereby granted, free of charge/); // MIT body
  });

  it("reproduces OSMD's pre-bundled deps that rollup-plugin-license can't see in the graph", () => {
    // OSMD ships a comment-stripped build that inlines these; we add them explicitly.
    for (const pkg of ["vexflow", "jszip", "loglevel", "typescript-collections"]) {
      expect(report).toContain(pkg);
    }
    expect(report).toContain("bundled via opensheetmusicdisplay");
  });
});
