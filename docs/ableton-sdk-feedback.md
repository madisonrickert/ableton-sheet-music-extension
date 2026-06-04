# Ableton Extensions SDK — Feedback / Wishlist

Running notes for Ableton on the Extensions SDK beta, gathered while building `ableton-sheet-music-extension`.

**SDK version:** `1.0.0-beta.0` (`@ableton-extensions/sdk`)
**Tested against:** Ableton Live 12.4.5b3 (beta)
**Maintainer:** Madison Rickert

> Living document — append new items as they come up during development.

---

## API requests

### 1. Writable warp markers
`AudioClip.warpMarkers` is currently **read-only** (getter only); only `warping` and `warpMode` are settable. There's no way to add, move, or delete warp markers from an extension.

- **Use case:** programmatic warp-syncing — e.g. aligning imported audio (stems) to a master track. Today that requires editing the `.als` XML by hand; a writable warp-marker API would let an extension do it natively and safely.
- **Ask:** setters / methods on `AudioClip` to create, move, and remove warp markers (e.g. `addWarpMarker({ beatTime, sampleTime })`, `removeWarpMarker(...)`).

### 2. Global song time signature
`Song` exposes `tempo`, `rootNote`, `scaleName`, `scaleMode`, `scaleIntervals`, etc., but **not the project's time signature**. Time signature is only on `Scene` (`signatureNumerator` / `signatureDenominator`), and those return **`-1`** when the scene follows the global signature (the common case) — so an extension cannot read the actual project signature (e.g. 4/4).

- **Use case:** any time-aware tool. The sheet-music extension must currently default to 4/4 and offer a manual override, because it can't read that the set is in, say, 3/4 or 6/8.
- **Ask:** `Song.signatureNumerator` / `Song.signatureDenominator` (the global/transport time signature), and/or a per-clip time signature where applicable.

---

### 3. Resizable modal windows
`ui.showModalDialog(url, width, height)` opens a **fixed-size, non-resizable** window — there's no `resizable` flag or min/max size, so the user can't drag it larger to fit a longer score.

- **Use case:** a sheet-music viewer (or any editor/viewer) needs to resize to fit its content.
- **Ask:** a `resizable` option and/or min/max size parameters on `showModalDialog`.

### 4. Working native close button on modal windows
The modal window has **no native window chrome / no working OS close button** (no red traffic-light on macOS). The only way to dismiss it is for the page to post `close_and_send`, so every extension must build its own in-content close control — otherwise the window can get stuck open with no way out.

- **Use case:** users expect the native close button (and ⌘W) to dismiss a window.
- **Ask:** give modal windows real OS chrome with a working native close that resolves/rejects the `showModalDialog` promise — or, at minimum, document that extensions must supply their own close affordance.

### 5. Non-modal / dockable webview panel
The only interactive UI surface is `showModalDialog`, which is **modal and blocking** — while it's open the user can't touch Live. The other UI APIs are `registerContextMenuAction` (an entry point, not a window) and `withinProgressDialog` (transient progress only). There is no persistent, non-modal, or dockable panel.

- **Use case:** a sheet-music viewer should be able to stay open *beside* the piano roll while the user edits notes and update as they go. The blocking modal forces a "close → edit → reopen" loop instead of live viewing — this single constraint shaped our entire no-live-sync design.
- **Ask:** a non-modal / dockable webview panel (akin to a Max for Live device or a docked view) that can remain open while the user works in Live.

### 6. File-save dialog + a way to return data without closing the modal
There's no save-file dialog, and the **only** webview→extension channel (`close_and_send`) also **closes the modal**. So an extension can't "export and stay open," and can't let the user choose where to save — it can only write to its sandboxed storage dir on close.

**Tested workaround (fails):** triggering a browser download from the webview (blob / `<a download>` / `jsPDF.save()`) is **blocked by the host WebView** (WKWebView, Live 12.4.5b3) — the link opens the file *inline* (navigating the webview away) instead of downloading, and navigating away returns an **empty** `close_and_send` result (which naive parsing then crashes on). So there is currently **no way** for an extension to save a file while keeping the modal open. We settled on: export writes to the storage dir and the extension reveals it in Finder via `open -R` (which closes the modal).

- **Use case:** "Export this format and keep viewing"; "Save As… to a folder I choose."
- **Ask:** a `ui.showSaveDialog(...)` (returning a user-chosen path the extension may write to), a non-closing message channel so the webview can hand data to the extension without dismissing the dialog, and/or allow downloads in the host WebView.

## Observations (not blocking, noted for completeness)

- **Numeric fields are `BigInt` at runtime** despite the `.d.ts` declaring them as `number` (e.g. `NoteDescription.pitch/startTime/duration`, `Song.tempo`, `Scene.signature*`). Consumers must coerce with `Number(...)` at the boundary or `JSON.stringify` / arithmetic throws. Either the types should say `bigint`, or the runtime should return `number` to match the types.
- **`extensions-cli run` doesn't set `storageDirectory` / `tempDirectory`** unless `--storage-directory` / `--temp-directory` are passed, so an extension that uses them works when installed (Live provides them) but throws under the dev loop unless the flags are supplied. A sensible default (e.g. a temp dir) for `run` would smooth first-run dev.
