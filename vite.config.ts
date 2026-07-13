import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { viteSingleFile } from "vite-plugin-singlefile";
import license from "rollup-plugin-license";

// Where the generated notices land. Absolute (resolved from this file) so the
// report always lands in the UI build dir regardless of the cwd the build runs
// from. extension.ts imports this file and embeds it in the shipped bundle.
const licenseReport = fileURLToPath(
  new URL("./ui/dist/third-party-licenses.txt", import.meta.url),
);

// OSMD 1.x ships a pre-bundled, comment-stripped build that inlines its own
// runtime dependencies, so rollup-plugin-license can't see them in the module
// graph — yet their code rides inside OSMD's bundle and is therefore shipped.
// We reproduce their notices explicitly so their MIT / dual-license terms are met.
// (Mirrors `dependencies` in node_modules/opensheetmusicdisplay/package.json,
// minus the types-only @types/vexflow.)
const OSMD_INLINED_DEPS = ["vexflow", "jszip", "loglevel", "typescript-collections"];

// Resolve OSMD's own dependencies through Node's module resolution, anchored at
// OSMD's install location rather than a hardcoded `./node_modules/<name>` path.
// Under npm's flat node_modules these usually get hoisted to the project root
// too, but pnpm's isolated node_modules only symlinks *direct* dependencies
// there; OSMD's own deps live nested under its own node_modules (inside the
// pnpm store), so resolution has to start from OSMD itself to find them under
// either package manager.
const requireFromHere = createRequire(import.meta.url);
const osmdRequire = createRequire(requireFromHere.resolve("opensheetmusicdisplay/package.json"));

function pkgDir(name: string): string {
  return dirname(osmdRequire.resolve(`${name}/package.json`));
}

/** Read a package's shipped license/notice file (whatever it's named), or fall back to its SPDX id. */
function readLicenseText(name: string, spdx: string): string {
  const dir = pkgDir(name);
  const file = readdirSync(dir).find((f) => /^(licen[sc]e|copying|notice)/i.test(f));
  return file
    ? readFileSync(join(dir, file), "utf-8").trim()
    : `(No license file was shipped with this package. SPDX: ${spdx}.)`;
}

/** A notice block for one OSMD-inlined dependency, sourced from node_modules at build time. */
function inlinedDepBlock(name: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(pkgDir(name), "package.json"), "utf-8"));
    const repo =
      pkg.homepage ||
      (typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url) ||
      "";
    const head = [`${name}@${pkg.version} — ${pkg.license ?? "UNKNOWN"} (bundled via opensheetmusicdisplay)`];
    if (repo) head.push(repo);
    return `${head.join("\n")}\n\n${readLicenseText(name, pkg.license ?? "UNKNOWN")}`;
  } catch {
    // A future OSMD may drop a dep from this list; flag it rather than fail the build.
    return `${name} — (declared by opensheetmusicdisplay but its license could not be read at build time)`;
  }
}

export default defineConfig({
  root: "ui",
  plugins: [viteSingleFile()],
  server: { port: 5173, fs: { allow: [".."] } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      // rollup-plugin-license is an output-phase Rollup plugin, so it lives here
      // (not in top-level `plugins`) and runs only on `vite build`. It inspects
      // exactly the modules that end up in the bundle — including transitive deps
      // like canvg/dompurify — and reproduces each one's copyright + full license
      // text. That's what makes the shipped .ablx satisfy OSMD's BSD-3-Clause
      // (clause 2) and the MIT terms; an in-app credit link alone would not.
      plugins: [
        license({
          thirdParty: {
            includePrivate: false,
            output: {
              file: licenseReport,
              template(dependencies) {
                const rule = `\n\n${"=".repeat(72)}\n\n`;
                const header =
                  "Sheet Music — third-party open-source licenses\n\n" +
                  "This extension bundles the open-source packages listed below. Each\n" +
                  "package's copyright notice and full license text is reproduced here, as\n" +
                  "required by those licenses (e.g. BSD-3-Clause and MIT).";
                const blocks = dependencies.map((d) => {
                  const repo =
                    d.homepage ||
                    (typeof d.repository === "string" ? d.repository : d.repository?.url) ||
                    "";
                  const head = [`${d.name}@${d.version} — ${d.license ?? "UNKNOWN"}`];
                  if (repo) head.push(repo);
                  const body =
                    d.licenseText?.trim() ||
                    d.noticeText?.trim() ||
                    `(No license text was shipped with this package. SPDX: ${d.license ?? "UNKNOWN"}.)`;
                  return `${head.join("\n")}\n\n${body}`;
                });
                const inlined = OSMD_INLINED_DEPS.map(inlinedDepBlock);
                return [header, ...blocks, ...inlined].join(rule) + "\n";
              },
            },
          },
        }),
      ],
    },
  },
});
