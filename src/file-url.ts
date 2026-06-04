import { pathToFileURL } from "node:url";

/**
 * Build a `file:` URL for a local path.
 *
 * Must go through `pathToFileURL` rather than `` `file://${path}` `` so spaces
 * and other reserved characters are percent-encoded. Live's modal-dialog host
 * rejects a URL with a raw space as malformed ("Invalid URL"), and a managed
 * extension's temp directory lives under "…/Application Support/Ableton/
 * Extensions Data/…" — so the unencoded form fails in every installed build
 * even though the dev temp path (no spaces) happens to work.
 */
export function fileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
