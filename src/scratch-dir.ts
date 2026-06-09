import * as fs from "node:fs/promises";

/** True for Node's permission-model write denial (the sandbox refused the path). */
export function isAccessDenied(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "ERR_ACCESS_DENIED";
}

/**
 * Return the first candidate dir we can actually create. The Extension Host's Node
 * sandbox denies writes to `tempDirectory` on the first Live launch after a macOS
 * reboot — the host resolves its `--allow-fs-write` grant before it creates that
 * dir (which boot also empties), so the grant never registers and the chart-ui.html
 * write fails with ERR_ACCESS_DENIED, leaving the chart window unable to open. We
 * fall back to a dir under the persistent `storageDirectory`, whose grant always
 * resolves. Non-permission errors propagate. See Ableton SDK feedback #10.
 */
export async function resolveScratchDir(
  candidates: string[],
  mkdir: (dir: string) => Promise<void> = (dir) => fs.mkdir(dir, { recursive: true }).then(() => {}),
): Promise<string> {
  let lastDenial: unknown;
  for (const dir of candidates) {
    try {
      await mkdir(dir);
      return dir;
    } catch (e) {
      if (!isAccessDenied(e)) throw e;
      lastDenial = e;
    }
  }
  throw lastDenial ?? new Error("resolveScratchDir: no candidates provided");
}
