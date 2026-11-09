# Changelog

Aetheris is a ClearVision v7 theme for Vencord / Vesktop. Versions follow the
palette, not ClearVision's own numbering; each entry states the ClearVision
build it was written against.

## 5.1.1 — 2026-11-09

Documentation and delivery release. The stylesheets are unchanged apart from the
version in their headers.

### Added
- Real client screenshots in `docs/screenshots/` for each build, plus the
  Settings → Themes list and a 4.0.0 comparison. The mock previews are kept only
  as a way to regenerate the palette without launching Discord.
- A credits table: AsterionVT for the Aetheris palette and the original 4.0.0,
  the ClearVision Team for the framework, Quinxxxx for Meloso, Google/Roboto.
- "What was done" section: what 4.0.0 broke, what 4.2.0 over-corrected, and what
  5.x changed, in one table.

### Changed
- README restructured around the three builds, with a screenshot-to-build map and
  a note that Vencord lists `@name`, not the filename.
- Screenshots are cropped to the client window; `tools/make-shots.py` builds them
  from the raw 2560x1600 captures.

## 5.1.0 — 2026-11-09

Written against ClearVision 7.0.1.

Three builds instead of one, and the palette pushed back toward the original's
saturation.

### Added
- `Aetheris.theme.css` (**Aetheris**): vivid build. Same palette, more purple —
  surfaces `rgba(18, 5, 72, 0.62)` over a stronger violet gradient, text ramp
  brightened to `#f0e6ff` / `#bda6ea`.
- `Aetheris-BG.theme.css` (**Aetheris BG**): the vivid palette over a wallpaper.
  The wallpaper sits under an explicit purple wash and a
  `saturate(1.5) hue-rotate(58deg) brightness(0.55)` filter, so any photo lands in
  the Aetheris range and stays readable; panels are opaque enough to hold text
  against the brightest possible filtered pixel.
- `Aetheris-Deep.theme.css` (**Aetheris Deep**): the 5.0.0 palette, renamed.
- `src/theme.template.css` + `src/palettes/*.css` + `src/variants.json`:
  the three builds are generated from one template and three palettes, so the
  surfaces, ramps and component fixes cannot drift apart.
- `npm run build`; `npm test` now fails if a shipped file differs from what the
  build would produce.
- Backdrop model for wallpapers: `test/gradient.js` treats a bitmap as "pure white
  through the build's own `brightness()` filter", composites the wash above it and
  measures text against that. Reported as a separate model in `docs/CONTRAST.md`.
- Per-build screenshots and `docs/screenshots/builds.jpg`.

### Changed
- `@name` values are distinct (`Aetheris`, `Aetheris BG`, `Aetheris Deep`) and the
  filenames match them, because Vencord lists `@name`, not the filename. Three
  byte-identical copies of 4.0.0 under different filenames were the reason the
  theme list looked wrong.
- `npm test` runs the whole contract per build, plus build drift, unique names and
  distinct palettes: 52 checks.
- `docs/CONTRAST.md` reports each build separately, including its backdrop model
  and composited text ground.

### Fixed
- The vivid build's gradient peak is bounded again (`#462782`, luminance 0.043),
  so text directly on the backdrop stays at 8:1 rather than 6.9:1.
- A wallpaper build no longer treats "bright photo" as unmeasurable: the wash plus
  `brightness()` cap makes the bound computable.

## 5.0.0 — 2026-11-09

Written against ClearVision 7.0.1.

### Added
- `test/` (17 dependency-free checks) and `npm test`: structure, `@import`
  order, no `!important`, `var()` resolution, the ClearVision settings contract,
  surface layering, and 27 measured contrast pairs.
- `npm run report` generates `docs/CONTRAST.md`, including the brightest pixel
  the background gradient can produce (`#3c2579`) and the composited value of
  every surface.
- `npm run preview` generates `docs/preview.html` and `docs/preview-before.html`
  from the current and previous stylesheets, plus the screenshots in
  `docs/screenshots/`.
- `docs/legacy/Aetheris-4.0.0.css`: the previous stylesheet, verbatim, so the
  before/after remains reproducible.
- Full `--brand-*`, `--brand-experiment-*` and `--primary-*` ramps, including the
  literal alpha variants Discord ships as blurple rgba values.
- Both class-name conventions (`name_hash` and `name-hash`) in every component
  selector.

### Changed
- Background is a bounded purple gradient (four layers, peak `#3c2579`) instead
  of a bitmap and instead of a single flat `#080228` fill.
- Surfaces are translucent steps (rail → sidebar → canvas → raised → overlay) so
  the gradient reads through them; the flat canvas was the main reason panels
  looked like one colour.
- Text ramp rebuilt: body `#e9dcff` (13.8:1 on canvas), muted `#a08cd4` (6.2:1),
  dim `#8f79c6` (5.2:1). The old `--text-muted: #8957ff` needed `!important` to
  survive ClearVision and still measured 3.0:1 on floating panels.
- `--channel-selected` is now dark text (`#12042c`) on the bright pill
  (`#9360f0`, 4.79:1). The old file set the label to the pill colour, so the
  selected channel name was effectively invisible in the variable contract.
- Danger/success/warning restored: `#ff7a94` / `#4ade9e` / `#f9c46b` for text,
  with darker `*-fill` variants (`#c73e60`, `#247a52`) behind white labels.
  `--red-400/500` had been remapped to purple `#7150eb`, which destroyed the
  meaning of destructive UI.
- Mention rows are purple (`hsl(from --main-color h s l / 0.16)`) with an accent
  rail; they were maroon (`rgba(114, 0, 0, 0.15)`).
- Chat input moved from the near-black `#0c0c0e` to the raised purple step with
  an accent rim and a focus glow.
- Scrollbar thumb `#6a3fc0` instead of `#d0b8f4`, which was the brightest object
  on screen.
- `--font-display` is Meloso again, so titles and usernames use the Aetheris face
  instead of only inheriting it as a missing-glyph fallback.

### Fixed
- Zero `!important` declarations: the previous file needed them only because it
  wrote derived variables (`--text-normal`, `--text-muted`) that ClearVision
  recomputes from `--normal-text` / `--muted-text`. Setting the source variables
  at `:root:is(.theme-dark, …)` wins by order and specificity instead.
- `--background-floating: #360099` no longer drags muted text down to 3.0:1.
- `--background-tertiary: #0c0c0e` no longer punches a near-black hole in the
  palette; the rail is deep violet at 84% over the gradient.
- `--status-danger-background: #2409aa` (royal blue inside a purple theme) is
  replaced by a dark rose.
