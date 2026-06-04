# Ableton Sheet Music Extension

[![CI](https://github.com/madisonrickert/ableton-sheet-music-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/madisonrickert/ableton-sheet-music-extension/actions/workflows/ci.yml)

View any MIDI clip in Ableton Live as readable sheet music — transpose it for any instrument and export **MusicXML**, **PDF**, or **PNG**. Built on the [Ableton Live Extensions SDK](https://github.com/Ableton/extensions-sdk) (beta).

![The extension showing a MIDI clip rendered as notation, with Transpose, Quantize, Time, and Export menus](docs/screenshot.png)

## Features

- **Notation view** — renders a selected MIDI clip as sheet music with [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/).
- **Transposition** — choose an instrument preset (Concert/C, Eb Alto Sax, Bb Trumpet/Clarinet, Bb Tenor Sax, Eb Baritone Sax, F Horn) or transpose by any number of semitones. The key signature follows automatically.
- **Smart staff & clef** — auto-detects treble, bass, or a two-staff **grand staff** for piano-range material; override from the Transpose menu.
- **Smart quantize** — auto-detects the best grid (1/4–1/32) from the clip; override anytime.
- **Time-signature override** — defaults to 4/4 (the SDK does not expose the project's global signature) with a manual override.
- **Export** — vector **PDF** (via `svg2pdf.js`), **PNG**, and **MusicXML** (opens cleanly in MuseScore / Dorico). Exports are written to the extension's storage folder and revealed in Finder.

## How it works

- A right-click action on a MIDI clip reads the clip's notes and opens a modal webview.
- Pure, unit-tested TypeScript modules convert notes → MusicXML: quantization, chord grouping, ties across barlines, instrument transposition, key signatures, and grand-staff splitting.
- The webview renders the MusicXML with OpenSheetMusicDisplay (SVG backend) and produces exports — vector PDF, PNG, and MusicXML — entirely client-side.
- The Node extension writes the returned file to its sandboxed storage directory and reveals it in Finder.

The notation core (`src/notation/`) has no dependency on the SDK or the DOM, so it is fully unit-testable.

## Install

Download the latest **`.ablx`** from the [**Releases** page](https://github.com/madisonrickert/ableton-sheet-music-extension/releases/latest), then:

1. In Ableton Live, open **Preferences → Extensions** (with Developer Mode **off**, so Live manages the extension).
2. Drag the `.ablx` onto that page.
3. Right-click any MIDI clip → **Show Chart…**.

Requires **Ableton Live 12.4 or newer with Extensions** (the Extensions feature is currently in the Live 12.4 beta; tested on 12.4.5b3). Prefer to build it yourself? See [Build from source](#build-from-source).

## Requirements

- **Ableton Live 12.4 or newer with Extensions enabled** — the Extensions feature is currently in the Live 12.4 beta (tested on 12.4.5b3).
- **Node.js ≥ 24**.
- The **Ableton Extensions SDK (beta)** — distributed by Ableton and **not** included in this repository (see Setup).

## Build from source

This project depends on the Ableton Extensions SDK, which is not published to npm and is not bundled here. Obtain it from Ableton, then make it available to the project:

1. Download and unpack the Extensions SDK (e.g. `extensions-sdk-1.0.0-beta.0`).
2. Place it as a **sibling** of this repository, so the tarballs resolve at `../extensions-sdk-1.0.0-beta.0/package-archives/`. (Alternatively, edit the `@ableton-extensions/*` `file:` paths in `package.json` to point at your copy.)
3. Install dependencies:
   ```bash
   npm install
   ```

## Develop

The fastest loop uses Live's Developer Mode and an externally-launched Extension Host:

1. Copy the env template and point it at your Live application:
   ```bash
   cp .env.example .env
   # then set EXTENSION_HOST_PATH, e.g. /Applications/Ableton Live 12 Suite.app
   ```
2. In Live: **Preferences → Extensions → enable Developer Mode**.
3. Build and launch the host (leave it running):
   ```bash
   npm start
   ```
4. Right-click a MIDI clip → **Show Chart…**.

## Build & package

```bash
npm run build      # production bundle
npm run package    # produces an installable .ablx
```

Install the `.ablx` by dropping it onto Live's **Extensions** preferences (with Developer Mode **off**, so Live manages the host).

## Test

```bash
npm test           # unit tests (vitest)
npm run typecheck  # type-check the extension and the webview
```
