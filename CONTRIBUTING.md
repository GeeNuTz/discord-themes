# Contributing

## Setup

```bash
git clone https://github.com/GeeNuTz/discord-themes
cd discord-themes
npm test          # every theme's suite
npm run verify    # the publish gate
```

No dependencies. Node 20+ for `node --test`.

## Adding or changing a theme

One theme per folder at the root. A folder is self-contained: its own `src/`, `test/`, `tools/`,
`docs/` and `package.json`, plus the shipped `.theme.css` and `-Revenge.json` at its root. Nothing
in one theme imports from another; the root only aggregates.

```bash
mkdir my-theme && cp -r comfy-deep/* my-theme/     # start from the closest match
cd my-theme
# replace src/palettes/<name>.css and src/variants.json
npm run build && npm test && npm run report && npm run preview
```

Then add a row to the table in the root README and mention the folder.

## Never edit generated files

`<Theme>.theme.css` and `<Theme>-Revenge.json` are rendered from `src/`. Change the palette or the
template, run `npm run build`, commit both. `npm test` fails if a shipped file drifts from the
generator.

## Before opening a PR

- `cd <theme> && npm run build` then `npm test` — green.
- `npm run report` committed with any palette change.
- `cd .. && npm run verify` — green. It runs every suite and then checks versions, artifact drift,
  secrets, personal paths, Cyrillic text, README images and the git state.
- New colours are `--<prefix>-*` tokens used by reference; no stray hex literals below section 1.
- No `!important`. If a rule needs it, the selector is wrong.
- Nothing puts white text on the decorative accent; use the `*-accent-fill` token.
- Component selectors cover both `name_` and `name-` class conventions.
- The Revenge manifest is generated — never hand-edit the JSON.
- Update README tables, CHANGELOG and `version.json` together.

## Style

- Four-space indent inside blocks, one declaration per line.
- Numbered sections in the same order across themes (tokens → settings → surfaces → text → ramps →
  status → borders → components).
- Comments explain *why* a value is that value, especially where contrast decided it.
- English for code, comments and docs.
