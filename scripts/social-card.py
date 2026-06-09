# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Generate the GitHub social-preview card for the Sheet Music extension.

Renders an HTML card (white bg, orange accent bar + eyebrow, bold title, gray
tagline, and a hero screenshot peeking up from the bottom) to a 1280x640 PNG —
the GitHub social-preview spec. Ported from the sibling AbleVSEP card so both
extensions share one generator.

The window is full width (no edge bleed on the sides) and bleeds off the BOTTOM,
so --hero-top is tuned to land the card's bottom edge (640px) in a clean staff
gap: staff 3 is clipped off-canvas with no bottom border and no clipped stems.
Build a clean hero by cropping the screenshot to its opaque window:

  bbox=$(magick docs/screenshot.png -alpha extract -threshold 50% -format "%@" info:)
  magick docs/screenshot.png -crop "$bbox" +repage -background white -alpha remove -alpha off /tmp/smx-hero.png

Usage:
  uv run scripts/social-card.py --title "Sheet Music" \
      --tagline "See any MIDI clip as notation. Transpose it for any instrument and export MusicXML, PDF & PNG." \
      --hero /tmp/smx-hero.png --out docs/social-preview.png

If the system spacing changes, re-tune --hero-top until the bottom edge sits in a
pure-white gap (no stems clipped, next system not visible).

Rendering uses the cached Playwright chrome-headless-shell at 2x, then downscales
with Lanczos for crisp text. No network, no API calls.
"""
import argparse, base64, subprocess, sys, tempfile, os
from pathlib import Path

CHROME = os.path.expanduser(
    "~/Library/Caches/ms-playwright/chromium_headless_shell-1217/"
    "chrome-headless-shell-mac-arm64/chrome-headless-shell"
)

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  html,body {{ width:1280px; height:640px; }}
  body {{ background:#fff; position:relative; overflow:hidden;
         font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;
         -webkit-font-smoothing:antialiased; }}
  .bar {{ position:absolute; left:0; top:0; bottom:0; width:12px; background:#FFA500; }}
  .content {{ position:absolute; left:100px; top:54px; right:48px; z-index:2; }}
  .eyebrow {{ color:#FFA500; font-weight:700; font-size:22px;
             letter-spacing:3.5px; text-transform:uppercase; }}
  .title {{ color:#111; font-weight:800; font-size:{title_size}px;
           letter-spacing:-1.5px; margin-top:14px; line-height:1.02; }}
  .tagline {{ color:#555; font-weight:500; font-size:27px; line-height:1.4;
             margin-top:20px; max-width:660px; }}
  .hero {{ position:absolute; left:100px; right:80px; top:{hero_top}px;
          border-radius:12px 12px 0 0; box-shadow:0 16px 48px rgba(0,0,0,0.28);
          border:1px solid rgba(0,0,0,0.10); overflow:hidden; background:#1a1a1a; }}
  .hero img {{ width:100%; display:block; }}
</style></head><body>
  <div class="bar"></div>
  <div class="content">
    <div class="eyebrow">{eyebrow}</div>
    <div class="title">{title}</div>
    <div class="tagline">{tagline}</div>
  </div>
  <div class="hero"><img src="data:image/png;base64,{hero_b64}"></div>
</body></html>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--tagline", required=True)
    ap.add_argument("--eyebrow", default="ABLETON LIVE EXTENSION")
    ap.add_argument("--hero", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--title-size", type=int, default=66)
    # Offset of the window's top. Tune so the card's bottom edge (640px) lands in a
    # clean staff gap — the window bleeds off-canvas below, so staff 3 is clipped
    # with no bottom border and no clipped stems.
    ap.add_argument("--hero-top", type=int, default=279)
    args = ap.parse_args()

    if not Path(CHROME).exists():
        sys.exit(f"chrome-headless-shell not found at {CHROME}")

    hero_b64 = base64.b64encode(Path(args.hero).read_bytes()).decode()
    html = HTML.format(
        eyebrow=args.eyebrow, title=args.title, tagline=args.tagline,
        hero_b64=hero_b64, title_size=args.title_size, hero_top=args.hero_top,
    )
    with tempfile.TemporaryDirectory() as td:
        htmlp = Path(td) / "card.html"
        rawp = Path(td) / "raw.png"
        htmlp.write_text(html)
        subprocess.run([
            CHROME, "--headless", "--no-sandbox", "--hide-scrollbars",
            "--force-device-scale-factor=2", "--window-size=1280,640",
            f"--screenshot={rawp}", htmlp.as_uri(),
        ], check=True, capture_output=True)
        # Downscale the 2x render to the 1280x640 social spec with ImageMagick
        # (Lanczos) — flatten on white so any transparency composites correctly.
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            "magick", str(rawp), "-background", "white", "-flatten",
            "-filter", "Lanczos", "-resize", "1280x640!", str(args.out),
        ], check=True)
    print(f"wrote {args.out} ({Path(args.out).stat().st_size//1024} KB)")


if __name__ == "__main__":
    main()
