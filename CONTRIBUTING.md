# Contributing

## Setup

```bash
git clone https://github.com/GeeNuTz/aetheris-theme
cd aetheris-theme
npm test
```

No dependencies. Node 20+ for `node --test`.

## Trying changes

Never edit the shipped `Aetheris*.theme.css` files: they are generated. Edit
`src/theme.template.css` (shared) or the matching `src/palettes/*.css`, run
`npm run build`, then copy a build into your client's themes folder and toggle it
in **Settings → Themes**. For a fast look without Discord, `npm run preview`
writes mock layouts to `docs/preview*.html`.

## Before opening a PR

- `npm run build` has been run and committed; `npm test` passes. A colour that
  fails AA is a failing test, not a style opinion.
- `npm run report` is committed alongside any palette change, so
  `docs/CONTRAST.md` never describes a palette that no longer exists.
- New colours are added as `--aether-*` tokens and used by reference; no hex
  literals below section 1 except inside `rgba()` hairlines.
- No `!important`. If a rule needs it, the selector is wrong — raise specificity
  or set the variable ClearVision reads.
- Nothing puts light text on `--main-color`. Use `--aether-accent-fill`.
- Component selectors must cover both `name_` and `name-` class conventions.
- If behaviour changes, update README tables, CHANGELOG and `version.json`.

## Style

- Four-space indent inside blocks, one declaration per line.
- Sections are numbered and keep their order (tokens → settings → surfaces →
  text → ramps → status → borders → components).
- Comments explain why a value is that value, especially where contrast decided it.
- English for code, comments and docs.

## Palette changes

If you change a surface or text colour, run `npm run report` and paste the new
tightest pair into the PR description. If you add a pair to the contract, add it
to `test/spec.js` so it is enforced.
