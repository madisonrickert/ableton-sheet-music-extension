---
name: Bug report
about: Report a problem with the Sheet Music extension
title: "[bug] "
labels: bug
---

**What happened?**
A clear description of the problem. Paste the exact error message the extension showed, if any.

**The clip**
- Arrangement clip or Session clip?
- Roughly how many notes / how long? (e.g. a 4-bar melody, a dense piano part)
- Anything unusual about it? (very high/low notes, extreme tempo, odd time feel)

**What you were doing**
- Instrument preset or semitone transposition:
- Clef / staff (auto, treble, bass, grand staff):
- Quantize grid and Time signature, if you changed them from the defaults:
- Export format attempted (MusicXML / PDF / PNG), or did it fail before export?

**Log file (please attach)**
The extension writes to Ableton's Extension Host log. Please attach it.

- **macOS:** `~/Library/Preferences/Ableton/Live <version>/ExtensionHost.txt`
  In Finder choose **Go > Go to Folder…**, paste that path (replace `<version>` with
  your Live version, e.g. `Live 12.4.5b3`), then drag `ExtensionHost.txt` into this issue.
- **Windows:** `%APPDATA%\Ableton\Live x.x.x\Preferences\ExtensionHost.txt`

The log includes lines prefixed with `Sheet Music:` that show exactly where it failed.

**Environment**
- Sheet Music extension version:
- Ableton Live version:
- OS:
