# Changelog

Comfy Deep for Discord. One palette, two clients: a ClearVision v7 stylesheet for
Vesktop/Vencord and a Revenge theme manifest. Versions follow the port, not Comfy's.

## 1.0.0 — 2026-11-09

First release. Written against ClearVision 7.0.1 and Revenge's `spec: 2` theme format.

### Added
- `ComfyDeep.theme.css`: the Comfy `Deep` palette as a ClearVision v7 theme for
  Vesktop/Vencord — translucent surfaces over one faint teal glow, a measured text
  ramp, teal accents split into decoration and text-bearing fills, and restored
  semantic colours.
- `ComfyDeep-Revenge.json`: the same palette as a `spec: 2` manifest with
  `semanticColors` (dark values) and a full `rawColors` ramp, generated from the same
  tokens so the two clients cannot drift.
- `src/` — the palette and template the two artifacts are generated from
  (`npm run build`).
- `test/` — 23 dependency-free checks: build drift, structure, ClearVision contract,
  canvas bound, surface order, 27 contrast pairs, a foreign-palette guard, manifest
  schema and manifest↔stylesheet palette equality.
- `tools/verify.mjs` — the pre-publish gate: tests, version consistency, artifact
  drift, secrets and personal paths, Cyrillic text, README images, git state.
- `docs/CONTRAST.md` and neutral screenshots rendered from the palette.

### Changed
- Body text is lifted from Comfy's `#4F9A87` to `#A8E3D3` (14:1 on the canvas); the
  original value stays as the muted step at 5.7:1 on the sidebar.
- The selected channel is dark ink on Comfy's `#4F9A87` pill (5.7:1) instead of light
  text on it (3.3:1).
- Error text is `#E05F5F` rather than Comfy's `#D25050`, which lands at 4.49:1 on the
  sidebar — one hundredth under AA.
- No webfont: Discord's `gg sans` replaces any borrowed display face, so the theme
  makes no font request.

### Notes
- Mobile coverage is partial: Discord's mobile app exposes fewer colour tokens than
  desktop. Surfaces that read neither map keep their default colour.
